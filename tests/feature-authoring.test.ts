import { describe, expect, it } from 'vitest'
import featureSchema from '../src/sanity/schemas/feature'
import portableTextSchema from '../src/sanity/schemas/objects/portableText'
import {
  FEATURE_TEMPLATE_IDS,
  featureArticleTemplates,
  resolveFeatureNewDocumentOptions,
} from '../src/sanity/featureTemplates'
import { getFeatureEditorExperience } from '../src/lib/featureAuthoring'

function getSchemaField(schema: { fields?: unknown[] }, name: string) {
  const field = (schema.fields as Array<{ name?: string }> | undefined)?.find(
    (candidate) => candidate.name === name
  )

  expect(field, `Expected schema field "${name}" to exist`).toBeDefined()
  return field as {
    name: string
    group?: string
    readOnly?: (context?: unknown) => boolean
    hidden?: (context?: unknown) => boolean
    initialValue?: unknown
    components?: { input?: unknown }
  }
}

describe('Feature authoring configuration', () => {
  it('defines the guided Feature editor groups and key authoring fields', () => {
    const groups = (featureSchema.groups || []).map((group) => group.name)

    expect(groups).toEqual([
      'basics',
      'heroMeta',
      'body',
      'people',
      'pageSettings',
      'seo',
    ])

    expect(getSchemaField(featureSchema, 'authoringStatus').group).toBe('basics')
    expect(getSchemaField(featureSchema, 'authoringStatus').components?.input).toBeDefined()
    expect(getSchemaField(featureSchema, 'content').group).toBe('body')
    expect(getSchemaField(featureSchema, 'previewReviewed').group).toBe('pageSettings')
    expect(getSchemaField(featureSchema, 'previewReviewed').initialValue).toBe(false)
    expect(getSchemaField(featureSchema, 'publishingChecklist').group).toBe('pageSettings')
    expect(getSchemaField(featureSchema, 'publishingChecklist').components?.input).toBeDefined()
  })

  it('marks static override body and people controls as read-only', () => {
    const contentField = getSchemaField(featureSchema, 'content')
    const authorsField = getSchemaField(featureSchema, 'authors')
    const newsletterField = getSchemaField(featureSchema, 'newsletterBackground')

    expect(contentField.readOnly?.({ document: { slug: { current: 'coronavirus' } } })).toBe(true)
    expect(authorsField.readOnly?.({ document: { slug: { current: 'coronavirus' } } })).toBe(true)
    expect(newsletterField.readOnly?.({ document: { slug: { current: 'coronavirus' } } })).toBe(true)

    expect(contentField.readOnly?.({ document: { slug: { current: 'new-guided-article' } } })).toBe(false)
    expect(authorsField.readOnly?.({ document: { slug: { current: 'new-guided-article' } } })).toBe(false)
  })

  it('hides secondary people controls until they are relevant', () => {
    const authorLayout = getSchemaField(featureSchema, 'authorLayout')
    const contributorsLayout = getSchemaField(featureSchema, 'contributorsLayout')
    const aboutPosition = getSchemaField(featureSchema, 'aboutGoInvoPosition')

    expect(authorLayout.hidden?.({ document: { authors: [] } })).toBe(true)
    expect(authorLayout.hidden?.({ document: { authors: [{}] } })).toBe(false)
    expect(contributorsLayout.hidden?.({ document: { contributors: [] } })).toBe(true)
    expect(contributorsLayout.hidden?.({ document: { contributors: [{}] } })).toBe(false)
    expect(aboutPosition.hidden?.({ document: { showAboutGoInvo: false } })).toBe(true)
    expect(aboutPosition.hidden?.({ document: { showAboutGoInvo: true } })).toBe(false)
  })

  it('ships article templates and replaces the generic Feature new-document option', () => {
    expect(featureArticleTemplates.map((template) => template.id)).toEqual([
      FEATURE_TEMPLATE_IDS.standard,
      FEATURE_TEMPLATE_IDS.research,
      FEATURE_TEMPLATE_IDS.visual,
    ])

    const previousOptions = [
      { templateId: 'feature', title: 'Feature' },
      { templateId: 'page', title: 'Page' },
    ]

    const resolved = resolveFeatureNewDocumentOptions(previousOptions as never[], {} as never)

    expect(resolved.some((item) => item.templateId === 'feature')).toBe(false)
    expect(resolved.slice(-3).map((item) => item.templateId)).toEqual([
      FEATURE_TEMPLATE_IDS.standard,
      FEATURE_TEMPLATE_IDS.research,
      FEATURE_TEMPLATE_IDS.visual,
    ])
  })

  it('classifies feature slugs by authoring experience', () => {
    expect(getFeatureEditorExperience('digital-healthcare')).toBe('static-override')
    expect(getFeatureEditorExperience('virtual-care')).toBe('code-assisted')
    expect(getFeatureEditorExperience('brand-new-feature')).toBe('guided')
  })
})

describe('Portable Text authoring contract', () => {
  it('exposes only the curated public text styles for new article authoring', () => {
    const blockMember = (portableTextSchema.of as Array<{ type?: string; styles?: Array<{ value: string }> }>).find(
      (member) => member.type === 'block'
    )

    expect(blockMember).toBeDefined()
    expect((blockMember?.styles || []).map((style) => style.value)).toEqual([
      'normal',
      'normalSpacious',
      'serifLarge',
      'h2',
      'h2Large',
      'sectionTitle',
      'h3',
      'h4',
      'blockquote',
      'callout',
    ])
  })

  it('limits public Results presets to the curated editor-facing variants', () => {
    const resultsMember = (portableTextSchema.of as Array<{
      name?: string
      components?: { input?: unknown }
      fields?: Array<{ name?: string; options?: { list?: Array<{ value: string }> } }>
    }>).find((member) => member.name === 'results')

    expect(resultsMember).toBeDefined()
    expect(resultsMember?.components?.input).toBeDefined()

    const variantField = resultsMember?.fields?.find((field) => field.name === 'variant')
    const itemsField = resultsMember?.fields?.find((field) => field.name === 'items') as
      | { validation?: unknown }
      | undefined

    expect(variantField?.options?.list?.map((option) => option.value)).toEqual([
      'row',
      'statBand',
      'stacked',
    ])
    expect(itemsField?.validation).toBeDefined()
  })

  it('includes an editor-friendly data table block for imported CSV or TSV content', () => {
    const dataTableMember = (portableTextSchema.of as Array<{
      name?: string
      components?: { input?: unknown }
      fields?: Array<{
        name?: string
        initialValue?: unknown
        validation?: unknown
        options?: { list?: Array<{ value: string }> }
      }>
    }>).find((member) => member.name === 'dataTable')

    expect(dataTableMember).toBeDefined()
    expect(dataTableMember?.components?.input).toBeDefined()

    const sourceField = dataTableMember?.fields?.find((field) => field.name === 'sourceData')
    const delimiterField = dataTableMember?.fields?.find((field) => field.name === 'delimiter')
    const headerField = dataTableMember?.fields?.find((field) => field.name === 'useFirstRowAsHeader')
    const stripedRowsField = dataTableMember?.fields?.find((field) => field.name === 'stripedRows')
    const toneField = dataTableMember?.fields?.find((field) => field.name === 'tone')

    expect(sourceField?.validation).toBeDefined()
    expect(delimiterField?.options?.list?.map((option) => option.value)).toEqual([
      'auto',
      'csv',
      'tsv',
    ])
    expect(headerField?.initialValue).toBe(true)
    expect(stripedRowsField?.initialValue).toBe(true)
    expect(toneField?.options?.list?.map((option) => option.value)).toEqual([
      'gray',
      'default',
    ])
  })
})
