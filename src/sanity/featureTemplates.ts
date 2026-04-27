import type { NewDocumentOptionsContext, Template, TemplateItem } from 'sanity'
import { getInitialOrderRank } from './orderable/rank'

const baseFeatureDefaults = {
  contentWidth: 'medium',
  bulletStyle: 'star',
  showPageMeta: true,
  authorLayout: 'equal',
  authorBackground: 'white',
  contributorsLayout: 'equal',
  contributorsBackground: 'white',
  newsletterBackground: 'white',
  peopleSectionPosition: 'beforeNewsletter',
  showAboutGoInvo: false,
  aboutGoInvoPosition: 'beforeNewsletter',
  aboutGoInvoVariant: 'default',
}

function featureTemplateValue(defaults: typeof baseFeatureDefaults) {
  return async (_params: undefined, context: Parameters<typeof getInitialOrderRank>[1]) => ({
    ...defaults,
    orderRank: await getInitialOrderRank('feature', context, 'before'),
  })
}

export const FEATURE_TEMPLATE_IDS = {
  standard: 'feature-standard-article',
  research: 'feature-research-report',
  visual: 'feature-visual-stat-article',
} as const

export const featureArticleTemplates: Template[] = [
  {
    id: FEATURE_TEMPLATE_IDS.standard,
    title: 'Feature: Standard article',
    schemaType: 'feature',
    value: featureTemplateValue({
      ...baseFeatureDefaults,
      contentWidth: 'medium',
      bulletStyle: 'star',
      newsletterBackground: 'white',
    }),
  },
  {
    id: FEATURE_TEMPLATE_IDS.research,
    title: 'Feature: Research / report',
    schemaType: 'feature',
    value: featureTemplateValue({
      ...baseFeatureDefaults,
      contentWidth: 'wide',
      bulletStyle: 'disc',
      newsletterBackground: 'gray',
      showAboutGoInvo: true,
    }),
  },
  {
    id: FEATURE_TEMPLATE_IDS.visual,
    title: 'Feature: Visual / stat-heavy',
    schemaType: 'feature',
    value: featureTemplateValue({
      ...baseFeatureDefaults,
      contentWidth: 'wide',
      bulletStyle: 'star',
      newsletterBackground: 'gray',
      showPageMeta: false,
    }),
  },
]

export const featureTemplateItems: TemplateItem[] = [
  {
    templateId: FEATURE_TEMPLATE_IDS.standard,
    title: 'Feature: Standard article',
  },
  {
    templateId: FEATURE_TEMPLATE_IDS.research,
    title: 'Feature: Research / report',
  },
  {
    templateId: FEATURE_TEMPLATE_IDS.visual,
    title: 'Feature: Visual / stat-heavy',
  },
]

export function resolveFeatureNewDocumentOptions(
  prev: TemplateItem[],
  context: NewDocumentOptionsContext,
): TemplateItem[] {
  void context
  const withoutDefaultFeatureItem = prev.filter((item) => item.templateId !== 'feature')
  return [...withoutDefaultFeatureItem, ...featureTemplateItems]
}
