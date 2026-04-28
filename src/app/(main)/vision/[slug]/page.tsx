import type { Metadata } from 'next'
import Image from 'next/image'
import { draftMode } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { featureBySlugQuery, allFeaturesQuery } from '@/sanity/lib/queries'
import { urlForImage, PLACEHOLDER_IMAGE_URL } from '@/sanity/lib/image'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import { NewsletterSection } from '@/components/forms/NewsletterSection'
import { AboutGoInvo } from '@/components/ui/AboutGoInvo'
import { ArticleMeta } from '@/components/ui/ArticleMeta'
import { EmptyContentPlaceholder } from '@/components/sanity/EmptyContentPlaceholder'
import { GuidedFeatureContent } from '@/components/vision/GuidedFeatureContent'
import { resolveSectionBackground, type SectionBackground } from '@/lib/sectionBackgrounds'
import {
  hasMeaningfulFeatureBody,
  isCodeAssistedFeatureSlug,
  usesLegacyFeatureTransforms,
} from '@/lib/featureAuthoring'
import { featureSectionBackgroundFallbacks } from '@/lib/featureSectionBackgroundFallbacks'
import { findPortableHeading, stripAuthorHeading, stripTitleHeading } from '@/lib/utils'
import type { Feature } from '@/types'
import type { PortableTextBlock } from '@portabletext/types'

interface Props {
  params: Promise<{ slug: string }>
}

type FeatureContentBlock = PortableTextBlock & {
  background?: SectionBackground
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

function createPortableBlock(
  key: string,
  segments: Array<{ text: string; marks?: string[] }>,
  style = 'normal',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markDefs: any[] = [],
) {
  return {
    _key: key,
    _type: 'block',
    children: segments.map((segment, index) => ({
      _key: `${key}-span-${index}`,
      _type: 'span',
      marks: segment.marks || [],
      text: segment.text,
    })),
    markDefs,
    style,
  }
}

function createTextBlock(key: string, text: string, style = 'normal') {
  return createPortableBlock(key, [{ text }], style)
}

function plainSegment(text: string) {
  return { text }
}

function strongSegment(text: string) {
  return { text, marks: ['strong'] }
}

function supSegment(text: string) {
  return { text, marks: ['sup'] }
}

function createHealthcareDollarsMethodologyBlocks() {
  return [
    createTextBlock('healthcare-dollars-methodology-col1-nhe-label', 'Column 1, National health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col1-nhe-1', [
      strongSegment('$3,500B'),
      plainSegment(', 2017 National Health Expenditure'),
      supSegment('1'),
    ])),

    createTextBlock('healthcare-dollars-methodology-col2-nhe-label', 'Column 2, National health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-nhe-1', [
      strongSegment('$2,600B'),
      plainSegment(', 2017 National health insurance'),
      supSegment('1'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-nhe-2', [
      strongSegment('$366B'),
      plainSegment(', 2017 Out of pocket'),
      supSegment('1'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-nhe-3', [
      strongSegment('$355B'),
      plainSegment(', 2017 Other third party payers and public health activity'),
      supSegment('1'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-nhe-4', [
      strongSegment('$250B'),
      plainSegment(', 2017 Tax exclusion, employee health insurance subsidy'),
      supSegment('2'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-nhe-5', [
      strongSegment('$168B'),
      plainSegment(', 2017 Research'),
      supSegment('3'),
    ])),

    createTextBlock('healthcare-dollars-methodology-col3-nhe-label', 'Column 3, National health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col3-nhe-1', [
      strongSegment('$1,200B'),
      plainSegment(', 2017 Private health insurance'),
      supSegment('4'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col3-nhe-2', [
      strongSegment('$1,400B'),
      plainSegment(', 2017 Public health insurance'),
      supSegment('1'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col3-nhe-3', [
      strongSegment('$103B'),
      plainSegment(', 2015 Private funds'),
      supSegment('4'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col3-nhe-4', [
      strongSegment('$36B'),
      plainSegment(', 2017 Public funds'),
      supSegment('4'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col3-nhe-5', [
      strongSegment('$5B'),
      plainSegment(', 2017 Nonprofit foundations'),
      supSegment('4'),
    ])),

    createTextBlock('healthcare-dollars-methodology-col4-nhe-label', 'Column 4, National health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-1', [
      strongSegment('$1,030.8B'),
      plainSegment(', 2017 Patient benefits'),
      supSegment('5'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-1a', [
      strongSegment('$3,500B'),
      plainSegment(', 2017 private health insurance expenditure'),
      supSegment('1'),
      plainSegment(', minus '),
      strongSegment('$169.2B'),
      plainSegment(' 2017 estimated administrative costs in private health insurance.'),
    ]), 2, 'legacyBullet'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-2', [
      strongSegment('$169.2B'),
      plainSegment(', 2017 Administrative costs, private health insurance'),
      supSegment('5'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-2a', [
      strongSegment('14.1%'),
      plainSegment(' in private health insurance administrative costs'),
      supSegment('5'),
      plainSegment(', multiplied by '),
      strongSegment('$3,500B'),
      plainSegment(' 2017 expenditure'),
      supSegment('1'),
    ]), 2, 'legacyBullet'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-3', [
      strongSegment('$804.51B'),
      plainSegment(', 2017 Medicare expenditure'),
      supSegment('6'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-4', [
      strongSegment('$582B'),
      plainSegment(', 2017 Medicaid expenditure'),
      supSegment('7'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-5', [
      strongSegment('$133B'),
      plainSegment(', 2017 Other health insurance programs'),
      supSegment('1'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-6', [
      strongSegment('$72B'),
      plainSegment(', 2015 Pharmaceutical private funds'),
      supSegment('3'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-7', [
      strongSegment('$17B'),
      plainSegment(', 2015 Medical technology private funds'),
      supSegment('3'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-8', [
      strongSegment('$6B'),
      plainSegment(', 2015 Biotechnology private funds'),
      supSegment('3'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col4-nhe-9', [
      strongSegment('$7B'),
      plainSegment(', 2015 Other sectors'),
      supSegment('3'),
    ])),

    createTextBlock('healthcare-dollars-methodology-col5-nhe-label', 'Column 5, National health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-1', [
      strongSegment('$534.64B'),
      plainSegment(', 2018 Insurance claims & indemnities for Medicare'),
      supSegment('6'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-2', [
      strongSegment('$203.73B'),
      plainSegment(', 2018 Grants, subsidies, contributions for Medicare'),
      supSegment('6'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-3', [
      strongSegment('$66.13'),
      plainSegment(', 2018 Other expenses for Medicare'),
      supSegment('6'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-4', [
      strongSegment('$71B'),
      plainSegment(', 2017 Administrative costs of Medicaid'),
      supSegment('8'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-4a', [
      strongSegment('12.2%'),
      plainSegment(' is mean administrative loss % for MCOs, multiplied by '),
      strongSegment('$582B'),
      plainSegment(' 2017 Medicaid expenditure'),
      supSegment('7'),
    ]), 2, 'legacyBullet'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-5', [
      strongSegment('$511B'),
      plainSegment(', 2017 Patient benefits from Medicaid'),
      supSegment('8'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-5a', [
      strongSegment('$582B'),
      plainSegment(', 2017 Medicaid expenditure'),
      supSegment('7'),
      plainSegment(', minus '),
      strongSegment('$71B'),
      plainSegment(' 2017 administrative costs of Medicaid'),
      supSegment('8'),
      plainSegment(', minus '),
      strongSegment('$46B'),
      plainSegment(' 2017 administrative costs of Medicaid'),
      supSegment('9'),
    ]), 2, 'legacyBullet'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-6', [
      strongSegment('$45.8B'),
      plainSegment(', 2014 Fraud, waste, and abuse within Medicaid'),
      supSegment('9'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-7', [
      strongSegment('$52.55B'),
      plainSegment(', 2017 TRICARE expenditure'),
      supSegment('10'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-8', [
      strongSegment('$17.52B'),
      plainSegment(', 2017 CHIP expenditure'),
      supSegment('11'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-9', [
      strongSegment('$62B'),
      plainSegment(', 2017 Other health insurance programs not listed here'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col5-nhe-9a', [
      strongSegment('$133B'),
      plainSegment(', 2017 Other health insurance programs'),
      supSegment('1'),
      plainSegment(', minus '),
      strongSegment('$63B'),
      plainSegment(' 2017 TRICARE'),
      supSegment('10'),
      plainSegment(', minus '),
      strongSegment('$18B'),
      plainSegment(' 2017 CHIP'),
      supSegment('11'),
    ]), 2, 'legacyBullet'),

    createTextBlock('healthcare-dollars-methodology-col6-nhe-label', 'Column 6, National health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col6-nhe-1', [
      strongSegment('$454.14B'),
      plainSegment(', 2018 Patient benefits for Medicare'),
      supSegment('12'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col6-nhe-1a', [
      strongSegment('$534.64B'),
      plainSegment(', Insurance claims & indemnities, minus '),
      strongSegment('$80.5B'),
      plainSegment(' 2018 fraud, waste, and abuse'),
      supSegment('12'),
    ]), 2, 'legacyBullet'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col6-nhe-2', [
      strongSegment('$80.5B'),
      plainSegment(', 2018 Fraud, waste, and abuse for Medicare'),
      supSegment('12'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col6-nhe-2a', [
      strongSegment('10%'),
      plainSegment(' estimated fraud, waste, and abuse in 2012'),
      supSegment('12'),
      plainSegment(', multiplied by '),
      strongSegment('$804.51B'),
      plainSegment(' Medicare expenditure'),
      supSegment('6'),
    ]), 2, 'legacyBullet'),

    createTextBlock('healthcare-dollars-methodology-col1-phe-label', 'Column 1, Personal health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col1-phe-1', [
      strongSegment('$2,800B'),
      plainSegment(', 2016 Personal health expenditure'),
      supSegment('13'),
    ])),

    createTextBlock('healthcare-dollars-methodology-col2-phe-label', 'Column 2, Personal health expenditure section', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-phe-1', [
      strongSegment('$1,070B'),
      plainSegment(', 2016 Hospital, personal health expenditure'),
      supSegment('13'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-phe-2', [
      strongSegment('$658B'),
      plainSegment(', 2016 Physician and clinical, personal health expenditure'),
      supSegment('13'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-phe-3', [
      strongSegment('$325B'),
      plainSegment(', 2016 Prescription drugs, personal health expenditure'),
      supSegment('13'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-phe-4', [
      strongSegment('$160B'),
      plainSegment(', 2016 Nursing care facilities & continuing care, personal health expenditure'),
      supSegment('13'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-phe-5', [
      strongSegment('$123B'),
      plainSegment(', 2016 Dental, personal health expenditure'),
      supSegment('13'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-phe-6', [
      strongSegment('$375B'),
      plainSegment(', 2016 Other personal health expenditure'),
      supSegment('13'),
    ])),

    createTextBlock('healthcare-dollars-methodology-col1-hhs-label', 'Column 1, Health and human services expenditure', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col1-hhs-1', [
      strongSegment('$1,110B'),
      plainSegment(', 2018 Health and human services expenditure'),
      supSegment('14'),
    ])),

    createTextBlock('healthcare-dollars-methodology-col2-hhs-label', 'Column 2, Health and human services expenditure', 'smallGrayLabel'),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-hhs-1', [
      strongSegment('$1T'),
      plainSegment(', 2018 Centers for Medicare & Medicaid Services'),
      supSegment('14'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-hhs-2', [
      strongSegment('$47B'),
      plainSegment(', 2018 Administration for children & families'),
      supSegment('14'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-hhs-3', [
      strongSegment('$26B'),
      plainSegment(', 2018 National Institutes of Health'),
      supSegment('14'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-hhs-4', [
      strongSegment('$6B'),
      plainSegment(', 2018 Centers for Disease Control & Prevention'),
      supSegment('14'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-hhs-5', [
      strongSegment('$5B'),
      plainSegment(', 2018 Indian Health Service'),
      supSegment('14'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-hhs-6', [
      strongSegment('$4B'),
      plainSegment(', 2018 Substance abuse and mental health services administration'),
      supSegment('14'),
    ])),
    toBulletListItem(createPortableBlock('healthcare-dollars-methodology-col2-hhs-7', [
      strongSegment('$2B'),
      plainSegment(', 2018 Food and drug administration'),
      supSegment('14'),
    ])),
  ]
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

function toBulletListItem(block: any, level = 1, listItem = 'bullet') { // eslint-disable-line @typescript-eslint/no-explicit-any
  const normalized = normalizeSupFollowerSpacing(block)
  return {
    ...normalized,
    level,
    listItem,
    style: 'normal',
  }
}

function hasButtonLabel(block: any, label: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return block?._type === 'buttonGroup' &&
    Array.isArray(block.buttons) &&
    block.buttons.some((button: any) => button?.label === label) // eslint-disable-line @typescript-eslint/no-explicit-any
}

function transformOwnYourHealthDataActions(content: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const comicUrl = 'https://dd17w042cevyt.cloudfront.net/pdf/vision/own-your-health-data/Own-Your-Health-Data.pdf'
  const whitepaperUrl = 'https://docs.google.com/document/d/13j03-beeoOZujMK6smdjcicKAb1Jh_L6tn_NG91Nq4M/edit'
  const githubUrl = 'https://github.com/goinvo/OwnYourHealthData'
  const columnsIndex = content.findIndex(
    (block) => block?._type === 'columns' &&
      Array.isArray(block.content) &&
      block.content.filter((item: any) => item?._type === 'image').length >= 2 // eslint-disable-line @typescript-eslint/no-explicit-any
  )
  const viewWhitepaperIndex = content.findIndex((block) => hasButtonLabel(block, 'View Whitepaper'))
  const downloadComicIndex = content.findIndex((block) => hasButtonLabel(block, 'Download Comic'))

  if (columnsIndex < 0 || viewWhitepaperIndex < 0 || downloadComicIndex < 0) {
    return content
  }

  const columnsBlock = content[columnsIndex]
  if (columnsBlock.content.some((item: any) => item?._type === 'buttonGroup')) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return content
  }

  const [comicImage, whitepaperImage] = columnsBlock.content
    .filter((item: any) => item?._type === 'image') // eslint-disable-line @typescript-eslint/no-explicit-any
    .slice(0, 2)

  return content
    .map((block, index) => {
      if (index !== columnsIndex) return block

      return {
        ...columnsBlock,
        layout: '2',
        content: [
          { ...comicImage, link: comicUrl },
          { ...content[downloadComicIndex], layout: 'fullWidth' },
          createPortableBlock(
            'own-your-health-data-github-link',
            [{ text: 'On GitHub', marks: ['github-link'] }],
            'normal',
            [{ _key: 'github-link', _type: 'link', href: githubUrl, blank: true }],
          ),
          { ...whitepaperImage, link: whitepaperUrl },
          { ...content[viewWhitepaperIndex], layout: 'fullWidth' },
        ],
      }
    })
    .filter((_, index) => index !== viewWhitepaperIndex && index !== downloadComicIndex)
}

function extractPrecisionAutismSpecialThanks(content: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const headingIndex = content.findIndex(
    (block) => textFromPortableBlock(block).toLowerCase() === 'special thanks to...'
  )

  if (headingIndex < 0) {
    return { content }
  }

  const specialThanks: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
  let endIndex = headingIndex + 1
  while (endIndex < content.length) {
    const block = content[endIndex]
    if (block?._type !== 'block' || block?.listItem !== 'bullet') break
    specialThanks.push(block)
    endIndex += 1
  }

  if (specialThanks.length === 0) {
    return { content }
  }

  return {
    content: [
      ...content.slice(0, headingIndex),
      ...content.slice(endIndex),
    ],
    specialThanks,
    specialThanksHeading: textFromPortableBlock(content[headingIndex]),
  }
}

function addPhysicianBurnoutMobileContributorImage(content: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const mobileImageUrl = 'https://dd17w042cevyt.cloudfront.net/images/features/burnout/contributors-mobile.jpg?w=800'

  return content.map((block) => {
    if (
      block?._type !== 'image' ||
      block?.mobileImageUrl ||
      !String(block?.alt || '').startsWith('A physician balancing the heavy burden of contributors to burnout.')
    ) {
      return block
    }

    return {
      ...block,
      mobileImageUrl,
    }
  })
}

function createSpan(key: string, text: string, marks: string[] = []) {
  return {
    _key: key,
    _type: 'span',
    marks,
    text,
  }
}

function referenceSpan(key: string, refNumber: string) {
  return createSpan(key, refNumber, ['sup'])
}

function superscriptSeparatorSpan(key: string) {
  return createSpan(key, ', ', ['supSeparator'])
}

function addSpacingAfterCitationSpans(block: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (block?._type !== 'block' || !Array.isArray(block.children)) return block

  return {
    ...block,
    children: block.children.map((child: any, index: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const previous = block.children[index - 1]
      const previousText = String(previous?.text || '').trim()
      const previousIsCitation = previous?.marks?.includes('sup') && /^\d+(?:,\d+)*$/.test(previousText)
      const currentStartsText = typeof child?.text === 'string' && /^[A-Za-z0-9"']/.test(child.text)

      if (previousIsCitation && currentStartsText) {
        return {
          ...child,
          text: ` ${child.text}`,
        }
      }

      return child
    }),
  }
}

function fixVirtualDiabetesCareCitations(content: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return content.flatMap((block) => {
    const text = textFromPortableBlock(block)

    if (block?._type === 'references' && Array.isArray(block.items)) {
      return [{
        ...block,
        items: block.items.filter(
          (item: { title?: string }) => !item.title?.startsWith('Bunnell, R.'),
        ),
      }]
    }

    if (block?._type === 'columns' && Array.isArray(block.content)) {
      const image = block.content.find((item: any) => item?._type === 'image') // eslint-disable-line @typescript-eslint/no-explicit-any
      const textBlock = block.content.find((item: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
        textFromPortableBlock(item).startsWith('A key resource in providing care to these individuals is time.')
      )

      if (image && textBlock) {
        const key = textBlock._key || 'virtual-diabetes-care-rural-urban'
        return [
          image,
          addSpacingAfterCitationSpans({
            ...textBlock,
            markDefs: [
              {
                _key: `${key}-rural-link`,
                _type: 'link',
                href: '/work/tabeeb-diagnostics',
              },
            ],
            children: [
              createSpan(`${key}-span-0`, 'A key resource in providing care to these individuals is time. In '),
              createSpan(`${key}-span-1`, 'rural areas', [`${key}-rural-link`]),
              createSpan(`${key}-span-2`, ', the commute time to the nearest doctor is an hour on average. In underserved urban areas, the time to an appointment can be months because of the low physician to patient ratios.'),
              referenceSpan(`${key}-ref-9`, '9'),
            ],
          }),
        ]
      }
    }

    if (text.startsWith('By 2020, telehealth visits within the Medicare program')) {
      const key = block._key || 'virtual-diabetes-care-medicare-telehealth'
      return [addSpacingAfterCitationSpans({
        ...block,
        markDefs: [],
        children: [
          createSpan(
            `${key}-span-0`,
            'By 2020, telehealth visits within the Medicare program represented 8% of primary care visits, and 3% of specialists visits, with the largest increase in visits seen in mental health / behavioral health.',
          ),
          referenceSpan(`${key}-ref-1`, '1'),
          createSpan(
            `${key}-span-1`,
            'With Medicare waiving its strict telehealth reimbursement rules, the amount of telehealth services delivered from April to December, 2020 increased tenfold from the previous year, from 5 million to 53 million, according to the U.S. Government Accountability Office.',
          ),
          referenceSpan(`${key}-ref-2`, '2'),
          createSpan(
            `${key}-span-2`,
            'At the peak of the pandemic, surveys showed that 32%, or nearly a third, of all outpatient visits were telehealth.',
          ),
          referenceSpan(`${key}-ref-3`, '3'),
        ],
      })]
    }

    if (text.startsWith('Chronic conditions like diabetes, stroke, and heart disease')) {
      const key = block._key || 'virtual-diabetes-care-treating-diabetes'
      return [addSpacingAfterCitationSpans({
        ...block,
        markDefs: [],
        children: [
          createSpan(
            `${key}-span-0`,
            'Chronic conditions like diabetes, stroke, and heart disease represent the leading cause for death and disability in the United States, according to the Centers for Disease Control and Prevention.',
          ),
          referenceSpan(`${key}-ref-5a`, '5'),
          createSpan(
            `${key}-span-1`,
            'Six out of 10 Americans have at least one chronic disease that is often preventable with healthy lifestyle habits.',
          ),
          referenceSpan(`${key}-ref-5b`, '5'),
          createSpan(
            `${key}-span-2`,
            'Diabetes, in particular, affects 463 million people worldwide.',
          ),
          referenceSpan(`${key}-ref-6`, '6'),
          createSpan(
            `${key}-span-3`,
            'In the U.S alone, 37.3 million adults or 11% of the population are diagnosed with diabetes.',
          ),
          referenceSpan(`${key}-ref-7a`, '7'),
          createSpan(
            `${key}-span-4`,
            'Unfortunately, that includes 8.5 million people who are unaware they have diabetes.',
          ),
          referenceSpan(`${key}-ref-7b`, '7'),
          createSpan(
            `${key}-span-5`,
            'Once diagnosed with diabetes, a person has an increased risk of having other chronic health conditions like obesity, hypertension, heart and liver disease, as well as some forms of cancer. Being able to adequately treat and ideally prevent this condition could potentially prevent many of the chronic health conditions mentioned and promote health and wellness in many communities.',
          ),
        ],
      })]
    }

    if (text.startsWith('Virtual care delivery alleviates the limitations of face-to-face')) {
      const key = block._key || 'virtual-diabetes-care-delivery'
      return [addSpacingAfterCitationSpans({
        ...block,
        markDefs: [],
        children: [
          createSpan(
            `${key}-span-0`,
            'Virtual care delivery alleviates the limitations of face-to-face encounters by creating more touch points and supplementing in person care. Several recent studies show that a virtual managed care system for diabetes can lead to measurable clinical improvements that are similar to those seen with usual face-to-face medical care — including decrease in Hgb A1c, significant and sustained weight loss, and decrease in blood pressure.',
          ),
          referenceSpan(`${key}-ref-9`, '9'),
          superscriptSeparatorSpan(`${key}-sep-9-10`),
          referenceSpan(`${key}-ref-10`, '10'),
          superscriptSeparatorSpan(`${key}-sep-10-11`),
          referenceSpan(`${key}-ref-11`, '11'),
        ],
      })]
    }

    if (text.startsWith('Clinically, results from a 2021 systematic review')) {
      const key = block._key || 'virtual-diabetes-care-clinical-results'
      return [addSpacingAfterCitationSpans({
        ...block,
        markDefs: [],
        children: [
          createSpan(
            `${key}-span-0`,
            'Clinically, results from a 2021 systematic review and meta analysis of 29 randomized control trials demonstrated when compared to usual care Hgb A1c can be greatly influenced through the use of technology interventions of various types, including telephone, videoconferencing, interactive websites and mobile health apps.',
          ),
          referenceSpan(`${key}-ref-11`, '11'),
          createSpan(
            `${key}-span-1`,
            'Additionally, a significant decrease in weight / BMI and blood pressure has also been associated with telemedicine care for diabetes management. A telemedicine program started in the health system of UPMC in Pittsburgh showed an average decrease of A1c from 10.2% to 8.8% in three months.',
          ),
          referenceSpan(`${key}-ref-9`, '9'),
        ],
      })]
    }

    if (text.startsWith('As with many healthcare technologies and services')) {
      const key = block._key || 'virtual-diabetes-care-access-availability'
      return [addSpacingAfterCitationSpans({
        ...block,
        markDefs: [],
        children: [
          createSpan(
            `${key}-span-0`,
            'As with many healthcare technologies and services, access and availability can be an issue. There are fears, perhaps well-founded, that virtual care could further worsen disparities of the more vulnerable populations including the elderly, ethnic minority groups and others in underserved communities.',
          ),
        ],
      })]
    }

    return [addSpacingAfterCitationSpans(block)]
  })
}

function recolorTextMarkDefs(block: any, color: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (block?._type !== 'block' || !Array.isArray(block.markDefs)) {
    return block
  }

  let changed = false
  const markDefs = block.markDefs.map((markDef: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (markDef?._type !== 'textColor' || markDef.color === color) {
      return markDef
    }

    changed = true
    return {
      ...markDef,
      color,
    }
  })

  return changed ? { ...block, markDefs } : block
}

function createHealthcareAiRippleBullet(
  key: string,
  segments: Array<{ text: string; marks?: string[] }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markDefs: any[] = [],
) {
  return toBulletListItem(createPortableBlock(key, segments, 'normal', markDefs), 1)
}

function createHealthcareAiRippleEffectsBullets(keys: string[]) {
  const fallbackKeys = [
    'healthcare-ai-ripple-misinformation',
    'healthcare-ai-ripple-harmful-information',
    'healthcare-ai-ripple-biases',
    'healthcare-ai-ripple-workers',
    'healthcare-ai-ripple-ownership',
    'healthcare-ai-ripple-relationship',
  ]

  const keyAt = (index: number) => keys[index] || fallbackKeys[index]

  return [
    createHealthcareAiRippleBullet(keyAt(0), [
      strongSegment('Misinformation at scale'),
      plainSegment(': Stack Overflow banned ChatGPT answers as it got swamped with quality control at scale. ChatGPT makes it incredibly easy to post an answer, but the non-zero error rate is a real problem for quality control. There\'s no easy way to check ChatGPT\'s answers without doing the research manually. This could become a serious problem if everyone uses a similar tool for health answers.'),
    ]),
    createHealthcareAiRippleBullet(keyAt(1), [
      strongSegment('Harmful information'),
      plainSegment(': "Molotov Cocktail questions" can still be achieved by phrasing as a '),
      { text: 'print function question', marks: ['print-function-question-link'] },
      plainSegment('. Presumably similar information about how to effectively commit suicide, for example, could be easily obtained.'),
    ], [
      {
        _key: 'print-function-question-link',
        _type: 'link',
        href: 'https://twitter.com/zswitten/status/1598197802676682752',
      },
    ]),
    createHealthcareAiRippleBullet(keyAt(2), [
      strongSegment('Perpetuating harmful biases, conventions, etc'),
      plainSegment(': The AI will provide answers based on the material it is trained on. If the material is biased or non-inclusive, the AI\'s answers will reflect that. For example, when asked to portray a telehealth call, MidJourney generated four all-white doctors, three of whom were male.'),
    ]),
    createHealthcareAiRippleBullet(keyAt(3), [
      strongSegment('Impact on human workers'),
      plainSegment(': In the long run, AI could replace writers, artists, musicians, and many white-collar jobs. Ideally, AI could augment these people\'s work by generating a starting point that humans can perfect or brainstorming initial concepts. However, this new technology may ultimately fill jobs and put humans out of work.'),
    ]),
    createHealthcareAiRippleBullet(keyAt(4), [
      strongSegment('Property and ownership issues'),
      plainSegment(': Many have raised the issue that image generation AI is trained on art that it does not own. Some artists have seen their personal style and even their signature show up in Stable Diffusion ('),
      { text: 'article', marks: ['stable-diffusion-article-link'] },
      plainSegment(').'),
    ], [
      {
        _key: 'stable-diffusion-article-link',
        _type: 'link',
        href: 'https://www.cbc.ca/radio/asithappens/artificial-intelligence-ai-art-ethics-greg-rutkowski-1.6679466',
      },
    ]),
    createHealthcareAiRippleBullet(keyAt(5), [
      strongSegment('Our relationship with technology and each other'),
      plainSegment(': Human immersion into technology has not always had a positive impact on health (e.g., social media\'s impact on mental health). How can we make sure we\'re not running blindly into more negative effects in the name of "progress?" How will an increase of artificial intelligence impact human intelligence? It may allow humans to learn and accomplish new things, but it may also reduce our skills in other areas, like synthesis of information. It\'s important to closely examine what we might be losing.'),
    ]),
  ]
}

function replaceHealthcareAiRippleEffectsCopy(content: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const headingIndex = content.findIndex(
    (block) => textFromPortableBlock(block) === 'Ripple Effects and Unintended Outcomes'
  )

  if (headingIndex < 0) {
    return content
  }

  const firstBulletIndex = content.findIndex(
    (block, index) => index > headingIndex && block?._type === 'block' && block?.listItem === 'bullet'
  )

  if (firstBulletIndex < 0) {
    return content
  }

  let endIndex = firstBulletIndex
  while (endIndex < content.length && content[endIndex]?._type === 'block' && content[endIndex]?.listItem === 'bullet') {
    endIndex += 1
  }

  const existingKeys = content
    .slice(firstBulletIndex, endIndex)
    .map((block) => block?._key)

  return [
    ...content.slice(0, firstBulletIndex),
    ...createHealthcareAiRippleEffectsBullets(existingKeys),
    ...content.slice(endIndex),
  ]
}

function transformFeatureContentForSlug(slug: string, content: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (slug === 'own-your-health-data') {
    return transformOwnYourHealthDataActions(content)
  }

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
        block?.layout === 'storyboard' &&
        Array.isArray(block.content)
      ) {
        const jayStoryIntro = 'Jay gets home from school. AiHealth believes they may be feeling depressed based on their health data:'
        const missingJayBullets = [
          { key: 'healthcare-ai-jay-hrv-low', text: 'Their heart rate variability is low' },
          { key: 'healthcare-ai-jay-phone-use', text: "They've been on their phone more than often" },
          { key: 'healthcare-ai-jay-step-count', text: 'Step count is low' },
        ]
        const hasMissingJayBullet = missingJayBullets.some(
          (bullet) => !block.content.some((item: any) => textFromPortableBlock(item) === bullet.text) // eslint-disable-line @typescript-eslint/no-explicit-any
        )

        if (hasMissingJayBullet) {
          const jayIntroIndex = block.content.findIndex(
            (item: any) => textFromPortableBlock(item) === jayStoryIntro // eslint-disable-line @typescript-eslint/no-explicit-any
          )

          if (jayIntroIndex >= 0) {
            const existingText = new Set(
              block.content.map((item: any) => textFromPortableBlock(item)) // eslint-disable-line @typescript-eslint/no-explicit-any
            )
            const bulletsToInsert = missingJayBullets
              .filter((bullet) => !existingText.has(bullet.text))
              .map((bullet) => createBulletBlock(bullet.key, bullet.text, 1))

            transformed.push({
              ...block,
              content: [
                ...block.content.slice(0, jayIntroIndex + 1),
                ...bulletsToInsert,
                ...block.content.slice(jayIntroIndex + 1),
              ],
            })
            continue
          }
        }
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

    return replaceHealthcareAiRippleEffectsCopy(transformed)
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
      return content.map((block: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const text = textFromPortableBlock(block)
        if (
          block?._type === 'block' &&
          (
            text === 'Half of face-to-face clinical office visits can be conducted virtually.' ||
            text === 'Care must go virtual' ||
            text.includes('Healthcare delayed is healthcare denied')
          )
        ) {
          return { ...block, style: 'h4LegacySm' }
        }
        if (block?._type === 'block' && text === 'The Top 15 Encounters Breakdown') {
          return { ...block, style: 'h3NoBottom' }
        }
        if (block?._type === 'block' && text === 'Methodology') {
          return { ...block, style: 'h2LargeCenteredSpacious' }
        }
        return block
      })
    }

    const faceToFaceText = 'face-to-face clinical office visits every year'
    const virtualText = 'can be conducted virtually'
    const nextContent = [...content]
    const blockText = (block: any) => textFromPortableBlock(block) // eslint-disable-line @typescript-eslint/no-explicit-any
    const applyVirtualCareHeadingStyles = (blocks: any[]) => blocks.map((block) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const text = blockText(block)
      if (
        block?._type === 'block' &&
        (
          text === 'Half of face-to-face clinical office visits can be conducted virtually.' ||
          text === 'Care must go virtual' ||
          text.includes('Healthcare delayed is healthcare denied')
        )
      ) {
        return { ...block, style: 'h4LegacySm' }
      }
      if (block?._type === 'block' && text === 'The Top 15 Encounters Breakdown') {
        return { ...block, style: 'h3NoBottom' }
      }
      if (block?._type === 'block' && text === 'Methodology') {
        return { ...block, style: 'h2LargeCenteredSpacious' }
      }
      return block
    })

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
      return applyVirtualCareHeadingStyles(nextContent)
    }

    if (introIndex >= 0) {
      nextContent.splice(introIndex + 1, 0, resultsBlock as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      return applyVirtualCareHeadingStyles(nextContent)
    }

    return applyVirtualCareHeadingStyles([resultsBlock as any, ...nextContent]) // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  if (slug === 'fraud-waste-abuse-in-healthcare') {
    return content.map((block) => {
      const normalized = normalizeSupFollowerSpacing(block)
      const text = textFromPortableBlock(normalized)

      if (
        normalized?._type === 'columns' &&
        Array.isArray(normalized.content) &&
        normalized.content.some((item: any) => textFromPortableBlock(item).startsWith('Fraud: intentional misuse of healthcare system resources.')) // eslint-disable-line @typescript-eslint/no-explicit-any
      ) {
        return {
          ...normalized,
          content: normalized.content.map((item: any) => item?._type === 'block' ? recolorTextMarkDefs(item, 'charcoal') : item), // eslint-disable-line @typescript-eslint/no-explicit-any
        }
      }

      if (normalized?._type === 'block' && text.startsWith('Fraud 10% + Waste 20%')) {
        return {
          ...normalized,
          style: 'legacyH2MdCentered',
        }
      }

      return normalized
    })
  }

  if (slug === 'human-centered-design-for-ai') {
    const sectionHeadings = new Set([
      'Four design principles for trustworthy AI co-pilots',
      'From black box to transparent partner',
      'What this means for health software leaders',
    ])
    const bulletItems = new Set([
      'A top layer that shows the recommendation, a simple confidence indicator, and one or two key factors that drove the suggestion.',
      'Deeper layers that expose more detail: additional contributing variables, thresholds, and full audit trails, only when a user asks for them.',
      'Clear indicators when a case falls outside the model’s typical population or input range.',
      'Visual confidence bands that distinguish strong signals from weak suggestions.',
      'Obvious controls for overriding, dismissing, or downgrading AI recommendations.',
      'Deep EHR integration so AI outputs appear where clinicians already work, rather than in separate portals.',
      'Specialty-specific views and shortcuts for radiology, pathology, emergency medicine, and other high-pressure settings.',
      'Mobile and tablet experiences tuned for environments like home health or telehealth visits.',
      'Bringing clinicians, coders, nurses, and patients into the design process from the start.',
      'Treating explainability, limitations, and feedback loops as primary requirements, not compliance afterthoughts.',
      'Measuring success not just in model performance, but in sustained, real‑world use and satisfaction across clinical teams',
    ])
      return content.map((block) => {
        const normalized = normalizeSupFollowerSpacing(block)
        const text = textFromPortableBlock(normalized)

      if (normalized?._type === 'block' && sectionHeadings.has(text)) {
        return {
          ...normalized,
          style: 'h3',
        }
      }

      if (normalized?._type === 'block' && bulletItems.has(text)) {
        return toBulletListItem(normalized)
      }

        if (normalized?._type === 'block' && text === "To unlock AI's promise, healthcare needs something different: AI deliberately designed to earn trust.") {
          return {
            _key: normalized._key,
            _type: 'quote',
            text,
            author: '',
            role: '',
          }
        }

        if (
          normalized?._type === 'quote' &&
          typeof normalized.text === 'string' &&
          normalized.text.startsWith('Studies of AI decision support tools show that layered explainability improves acceptance without overwhelming users') &&
          normalized.text.includes('The goal is not to teach every user data science')
        ) {
          return {
            ...normalized,
            text: 'Studies of AI decision support tools show that layered explainability improves acceptance without overwhelming users, especially when explanations use familiar clinical concepts instead of raw model internals.',
          }
        }

        if (normalized?._type === 'block' && normalized.style === 'h4' && /^\d+\.\s/.test(text) && Array.isArray(normalized.children) && normalized.children[0]?.text) {
          return {
            ...normalized,
          style: 'h4LegacySm',
          children: normalized.children.map((child: any, index: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (index !== 0 || typeof child?.text !== 'string') {
              return child
            }

            return {
              ...child,
              text: child.text.replace(/^(\d+\.)\s/, '$1  '),
            }
          }),
        }
      }

      if (normalized?._type === 'block' && text === 'About GoInvo') {
        return {
          ...normalized,
          style: 'h4',
        }
      }

      return normalized
    })
  }

  if (slug === 'healthcare-dollars') {
    const downloadButton = content
      .find((block) => block?._type === 'buttonGroup' && Array.isArray(block.buttons) && block.buttons.some((button: any) => button?.label === 'Download')) // eslint-disable-line @typescript-eslint/no-explicit-any
      ?.buttons?.find((button: any) => button?.label === 'Download') // eslint-disable-line @typescript-eslint/no-explicit-any
    const buyPrintButton = content
      .find((block) => block?._type === 'buttonGroup' && Array.isArray(block.buttons) && block.buttons.some((button: any) => button?.label === 'Buy Print')) // eslint-disable-line @typescript-eslint/no-explicit-any
      ?.buttons?.find((button: any) => button?.label === 'Buy Print') // eslint-disable-line @typescript-eslint/no-explicit-any

    const transformed: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
    let hasInsertedPosterSection = false
    let inMethodologySection = false
    let inMethodologyEntries = false
    let hasInjectedMethodologyLists = false

    for (const originalBlock of content) {
      const block = normalizeSupFollowerSpacing(originalBlock)
      const text = textFromPortableBlock(block)

      if (block?._type === 'block' && text === 'To Understand the Healthcare system, follow the money') {
        transformed.push({
          ...block,
          style: 'h4LegacySm',
        })
        continue
      }

      if (
        block?._type === 'columns' &&
        Array.isArray(block.content) &&
        block.content.some((item: any) => item?._type === 'image' && item.asset?._ref) && // eslint-disable-line @typescript-eslint/no-explicit-any
        block.content.some((item: any) => textFromPortableBlock(item).startsWith('*Tax exclusion $ amount is not added')) // eslint-disable-line @typescript-eslint/no-explicit-any
      ) {
        const posterImage = block.content.find((item: any) => item?._type === 'image' && item.asset?._ref) // eslint-disable-line @typescript-eslint/no-explicit-any
        const taxExclusionNote = block.content.find((item: any) => item?._type === 'block') // eslint-disable-line @typescript-eslint/no-explicit-any

        if (posterImage) {
          transformed.push({
            ...posterImage,
            _key: 'healthcare-dollars-poster-image',
            align: 'center',
            link: downloadButton?.url || posterImage.link,
            size: 'bleed',
          })
        }

        if (!hasInsertedPosterSection && (downloadButton || buyPrintButton)) {
          transformed.push({
            _key: 'healthcare-dollars-actions',
            _type: 'buttonGroup',
            buttons: [downloadButton, buyPrintButton].filter(Boolean).map((button: any) => ({ ...button })), // eslint-disable-line @typescript-eslint/no-explicit-any
            layout: 'fullWidth',
            spacing: 'legacyDouble',
          })
          hasInsertedPosterSection = true
        }

        if (taxExclusionNote) {
          transformed.push(createTextBlock(
            'healthcare-dollars-tax-exclusion-note',
            '*Tax exclusion $ amount is not added into the $3,500B national health expenditure. Though it is a part of expenditure, it is not included in many data sources and is unclear how it should be best organized without causing contradictions in the expenditure breakdowns.',
            'smallGrayNote'
          ))
        }
        continue
      }

      if (
        block?._type === 'buttonGroup' &&
        Array.isArray(block.buttons) &&
        block.buttons.some((button: any) => button?.label === 'Download' || button?.label === 'Buy Print') // eslint-disable-line @typescript-eslint/no-explicit-any
      ) {
        continue
      }

      if (block?._type === 'block' && text.startsWith('"Where your Health Dollars Go" is a map of the US healthcare system and its components.')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-intro-map',
          '"Where your Health Dollars Go" is a map of the US healthcare system and its components. By following the allocation and flow of money in healthcare, the thread of how the organizations, departments, and major players are connected becomes apparent.'
        ))
        continue
      }

      if (block?._type === 'block' && text.startsWith('The visualization serves two purposes.')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-intro-purpose',
          'The visualization serves two purposes. The first is to provide the public and professionals interested in the healthcare space a way to increase understanding and explore how all the pieces fit together. The second is to give providers, patient advocacy groups, health policymakers, and health economists a visual communication tool to discuss issues at the higher health systems level.'
        ))
        continue
      }

      if (block?._type === 'block' && text.startsWith('*$168B in research')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-research-note',
          '*$168B in research is a higher $ amount than the category breakdowns within it, as the $ amounts are taken from sources from differing years.',
          'smallGrayNote'
        ))
        continue
      }

      if (block?._type === 'block' && text.startsWith('*All $ amounts have been rounded')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-rounding-note',
          '*All $ amounts have been rounded to the nearest billionth for readability and scanning purposes.',
          'smallGrayNote'
        ))
        continue
      }

      if (block?._type === 'block' && text.startsWith('The US healthcare system is extremely convoluted.')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-spaghetti',
          'The US healthcare system is extremely convoluted. To call it “spaghetti” would be an understatement. Because of the complexity, accurately capturing and following associative and financial relationships is difficult. The wider picture of how organizations are connected, how money flows through the US healthcare system is difficult to see. As a result, public discourse around US healthcare issues and reforms are often too narrow in context. Many consumer services and products developed in the health technology space don’t consider long term, primary, secondary or tertiary, downstream effects they will have on the market or for patients in this wider view.'
        ))
        continue
      }

      if (block?._type === 'block' && text.startsWith('"Where your Health Dollars Go" provides a detailed high-level view')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-overview',
          '"Where your Health Dollars Go" provides a detailed high-level view of major components within the US healthcare system and how they interact. The map serves as a communication tool for health professionals, organizations, groups, and policymakers to develop services and policies with the context of the larger picture of how their plans may impact the nation from the government to individual patients. The visualization also provides a canvas for professionals to use, projecting their services and products on the map, to more effectively drive development that aligns with our patient health values.'
        ))
        continue
      }

      if (block?._type === 'block' && text === 'Methodology') {
        inMethodologySection = true
        inMethodologyEntries = false
        transformed.push(block)
        continue
      }

      if (block?._type === 'block' && text === 'Author') {
        inMethodologySection = false
        inMethodologyEntries = false
        transformed.push(block)
        continue
      }

      if (inMethodologySection && block?._type === 'block' && text.startsWith('The components of the healthcare system to include')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-methodology-intro',
          'The components of the healthcare system to include in the visualization were primarily based on what public data was available. Some expenditures were based on older estimates due to difficulty in finding up to date data (such as administrative costs for private health insurance).'
        ))
        continue
      }

      if (inMethodologySection && block?._type === 'block' && text.startsWith('Other expenditures, such as numbers on fraud, waste, and abuse')) {
        transformed.push(createTextBlock(
          'healthcare-dollars-methodology-estimates',
          'Other expenditures, such as numbers on fraud, waste, and abuse for health insurance programs, are best guesses based on a range of estimates as referenced below.'
        ))
        continue
      }

      if (inMethodologySection && block?._type === 'block' && text.startsWith('Column ')) {
        inMethodologyEntries = true
        if (!hasInjectedMethodologyLists) {
          transformed.push(...createHealthcareDollarsMethodologyBlocks())
          hasInjectedMethodologyLists = true
        }
        continue
      }

      if (inMethodologyEntries && block?._type === 'block' && block.style === 'normal') {
        continue
      }

      transformed.push(block)
    }

    return transformed
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

  const ogSourceImage = feature.articleHeroImage || feature.image
  const ogImage = ogSourceImage
    ? urlForImage(ogSourceImage).width(1200).height(630).url()
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

  const { isEnabled: isDraftMode } = await draftMode()
  const { data: feature } = (await sanityFetch({
    query: featureBySlugQuery,
    params: { slug },
    perspective: isDraftMode ? 'drafts' : undefined,
  })) as { data: Feature | null }

  if (!feature) {
    notFound()
  }

  if (feature.externalLink) {
    redirect(feature.externalLink)
  }

  // Optional article-level hero override (when the listing card image differs from the article hero)
  const heroImage = feature.articleHeroImage || feature.image
  const heroPosition = feature.articleHeroImage ? feature.articleHeroPosition : feature.heroPosition
  const fullImageCover = feature.articleHeroImage ? feature.articleFullImageCover : feature.fullImageCover

  // Hero is 1280x450 (~2.84:1) so use a closer aspect than 16:9 to
  // minimize top/bottom cropping at desktop widths. Fallback to a
  // generic placeholder when the article doesn't have a hero image
  // yet (new draft, or editor hasn't uploaded one).
  const heroImageUrl = heroImage
    ? urlForImage(heroImage).width(1600).height(564).url()
    : PLACEHOLDER_IMAGE_URL

  // Full image cover: show the complete image as page content, no hero crop
  const fullCoverUrl = fullImageCover && heroImage
    ? urlForImage(heroImage).width(1920).url()
    : null

  const widthClass = feature.contentWidth === 'wide' ? '' : feature.contentWidth === 'narrow' ? 'max-width-sm' : 'max-width-md'
  const useLegacyFacesLayout = slug === 'faces-in-health-communication'
  const articleContainerClassName = useLegacyFacesLayout
    ? 'mx-auto px-4 lg:px-4'
    : `max-width ${widthClass} content-padding mx-auto`
  const articleContainerStyle = useLegacyFacesLayout ? { maxWidth: '680px' } : undefined
  const usesCodeAssistedCms = isCodeAssistedFeatureSlug(slug)
  const usesLegacyTransforms = usesLegacyFeatureTransforms(slug)
  const backgroundFallbacks = usesCodeAssistedCms ? featureSectionBackgroundFallbacks[slug] : undefined
  const titleClassName = useLegacyFacesLayout ? 'header-xl mt-6 mb-6' : 'header-xl mt-8 mb-6'
  const showPageMeta = backgroundFallbacks?.showPageMeta ?? (feature.showPageMeta !== false)
  const transformedContributors = usesLegacyTransforms
    ? transformFeatureContributorsForSlug(slug, feature.contributors)
    : feature.contributors
  const authorVariant = (backgroundFallbacks?.authorLayout || feature.authorLayout) as 'equal' | 'stacked' | 'stacked-subheading' | 'primary-sidebar' | 'plain-list' | 'legacy-text-list' | undefined
  const contributorsVariant = (backgroundFallbacks?.contributorsLayout || feature.contributorsLayout) as 'equal' | 'stacked' | 'stacked-subheading' | 'primary-sidebar' | 'plain-list' | 'legacy-text-list' | undefined
  const authorBackground = resolveSectionBackground(feature.authorBackground, backgroundFallbacks?.authorBackground || 'white')
  const contributorsBackground = resolveSectionBackground(
    feature.contributorsBackground,
    backgroundFallbacks?.contributorsBackground || 'white'
  )
  const newsletterBackground = resolveSectionBackground(feature.newsletterBackground, backgroundFallbacks?.newsletterBackground || 'white')
  const peopleSectionPosition = feature.peopleSectionPosition || backgroundFallbacks?.peopleSectionPosition || 'beforeNewsletter'
  const aboutGoInvoSection = feature.showAboutGoInvo ? (
    <section className="pb-12">
      <div className={articleContainerClassName} style={articleContainerStyle}>
        <AboutGoInvo variant={feature.aboutGoInvoVariant} />
      </div>
    </section>
  ) : null
  const renderAboutAfterNewsletter = feature.aboutGoInvoPosition === 'afterNewsletter'

  const hasHeroImage = Boolean(heroImage)
  const hasContent = hasMeaningfulFeatureBody(feature.content)
  const heroEditTarget =
    isDraftMode && !hasHeroImage && !fullImageCover
      ? { documentType: 'feature' as const, documentId: feature._id, fieldPath: 'image' }
      : undefined

  return (
    <div className={slug === 'coronavirus' ? 'font-coronavirus' : undefined}>
      {/* Standard hero (cropped 16:9) — only for non-fullImageCover pages */}
      {!fullImageCover && heroImageUrl && (
        <SetCaseStudyHero
          image={heroImageUrl}
          bgPosition={heroPosition}
          editTarget={heroEditTarget}
        />
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
      {!fullImageCover && (
        <Reveal style="slide-up" duration={0.5}>
          <div className={articleContainerClassName} style={articleContainerStyle}>
            <h1
              className={titleClassName}
              style={{ viewTransitionName: 'page-title' }}
            >
              {feature.title}
            </h1>
            {!useLegacyFacesLayout && showPageMeta && (
              <ArticleMeta date={feature.date} categories={feature.categories} />
            )}
          </div>
        </Reveal>
      )}

      {!usesCodeAssistedCms && !usesLegacyTransforms ? (
        <GuidedFeatureContent
          initialData={feature}
          slug={slug}
          isDraftMode={isDraftMode}
        />
      ) : (
        <>
          {/* Empty-body placeholder shown in Presentation preview when no
              body blocks have been authored yet. Stays out of the public
              render so visitors don't see editor affordances. */}
          {isDraftMode && !hasContent && (
            <EmptyContentPlaceholder documentType="feature" documentId={feature._id} />
          )}

          {/* Content (without references — rendered separately after newsletter) */}
          {feature.content && (() => {
        let content: FeatureContentBlock[] = feature.content
        let authorHeading: string | undefined
        let extractedSpecialThanks: FeatureContentBlock[] | undefined
        let extractedSpecialThanksHeading: string | undefined

        if (usesCodeAssistedCms) {
          content = stripTitleHeading(content, feature.title)
        }

        if (usesCodeAssistedCms && feature.authors && feature.authors.length > 0) {
          authorHeading = findPortableHeading(content, ['Authors', 'Author'])
          content = stripAuthorHeading(content, {
            stripContributors: (transformedContributors?.length ?? 0) > 0,
          })
        }

        if (usesLegacyTransforms) {
          content = transformFeatureContentForSlug(slug, content)
        }

        if (slug === 'physician-burnout') {
          content = addPhysicianBurnoutMobileContributorImage(content)
        }

        if (slug === 'virtual-diabetes-care') {
          content = fixVirtualDiabetesCareCitations(content)
        }

        if (slug === 'precision-autism') {
          const extracted = extractPrecisionAutismSpecialThanks(content)
          content = extracted.content
          extractedSpecialThanks = extracted.specialThanks
          extractedSpecialThanksHeading = extracted.specialThanksHeading
        }

        const mainContent = content.filter((block) => block._type !== 'references')
        const referencesContent = content
          .filter((block) => block._type === 'references')
          .map((block) => (
            backgroundFallbacks?.referencesBackground && !block.background
              ? { ...block, background: backgroundFallbacks.referencesBackground }
              : block
          ))
        const portableTextVariant = backgroundFallbacks?.portableTextVariant
          || (usesLegacyTransforms && slug === 'virtual-care' ? 'gray-body' : undefined)
        const effectiveSpecialThanks = feature.specialThanks && feature.specialThanks.length > 0
          ? feature.specialThanks
          : extractedSpecialThanks
        const specialThanksHeadingText = feature.specialThanksHeading
          || extractedSpecialThanksHeading
          || (transformedContributors && transformedContributors.length > 0 ? 'Special thanks to...' : 'Contributors')
        const specialThanksHeadingStyle = feature.specialThanksHeadingStyle
          || (slug === 'precision-autism' && extractedSpecialThanks ? 'legacy-centered-h2' : 'subheading')
        const peopleSections = (
          <>
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

            {effectiveSpecialThanks && effectiveSpecialThanks.length > 0 && (
              <section className="pb-12">
                <div className={articleContainerClassName} style={articleContainerStyle}>
                  {specialThanksHeadingStyle === 'legacy-centered-h2' ? (
                    <h2 className="header-lg mt-16 mb-5 text-center">{specialThanksHeadingText}</h2>
                  ) : (
                    <h3 className="header-md mt-8 mb-4">{specialThanksHeadingText}</h3>
                  )}
                  <PortableTextRenderer content={effectiveSpecialThanks} />
                </div>
              </section>
            )}
          </>
        )

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

            {peopleSectionPosition !== 'afterNewsletter' && peopleSections}

            {/* About GoInvo (after Special Thanks) */}
            {!renderAboutAfterNewsletter && aboutGoInvoSection}

            {/* Newsletter */}
            <NewsletterSection
              background={newsletterBackground}
              cardWidth={backgroundFallbacks?.newsletterCardWidth || 'standard'}
              forceBand={Boolean(backgroundFallbacks?.forceNewsletterBand)}
            />

            {peopleSectionPosition === 'afterNewsletter' && peopleSections}

            {renderAboutAfterNewsletter && aboutGoInvoSection}

            {/* References follow the newsletter / people stack so pages can mirror Gatsby order per slug. */}
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
        </>
      )}
    </div>
  )
}
