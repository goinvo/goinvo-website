import { useEffect, useState, type ReactNode } from 'react'
import { Badge, Card, Flex, Stack, Text } from '@sanity/ui'
import type { InputProps, ObjectInputProps } from 'sanity'
import { PatchEvent, set, useFormValue, type StringInputProps } from 'sanity'
import { parseDataTableSource, type DataTableDelimiter } from '@/lib/dataTable'
import {
  getFeatureEditorExperience,
  hasFeatureCitations,
  hasFeaturePeople,
  hasFeatureReferences,
  hasMeaningfulFeatureBody,
} from '@/lib/featureAuthoring'

type FeatureDocumentValue = {
  title?: string
  slug?: { current?: string }
  image?: unknown
  content?: NonNullable<Parameters<typeof hasMeaningfulFeatureBody>[0]>
  authors?: unknown[]
  contributors?: unknown[]
  specialThanks?: unknown[]
  metaTitle?: string
  metaDescription?: string
  description?: string
  categories?: string[]
  date?: string
}

type ChecklistItem = {
  key: string
  label: string
  done: boolean
  kind: 'required' | 'optional'
  detail: ReactNode
}

function cardStyles(accent: string) {
  return {
    border: `1px solid ${accent}`,
    borderRadius: '8px',
    padding: '14px 16px',
  } as const
}

function statusPill(label: string, tone: 'neutral' | 'good' | 'warn') {
  const sanityTone = tone === 'good' ? 'positive' : tone === 'warn' ? 'caution' : 'default'

  return <Badge tone={sanityTone}>{label}</Badge>
}

export function FeaturePublishingChecklistInput(_props: InputProps) {
  void _props
  const document = (useFormValue([]) || {}) as FeatureDocumentValue
  const [openItemKey, setOpenItemKey] = useState<string | null>(null)
  const slug = document.slug?.current
  const experience = getFeatureEditorExperience(slug)

  if (experience === 'static-override') {
    return (
      <Card border padding={4} radius={2} tone="caution">
        <Text muted size={1}>
          This document still powers a code-rendered page. Use this entry for metadata and reference only, then review the live route directly after any code-side change.
        </Text>
      </Card>
    )
  }

  const requiredItems: ChecklistItem[] = [
    {
      key: 'required-basics',
      label: 'Title, slug, and hero image are set',
      done: Boolean(document.title && slug && document.image),
      kind: 'required',
      detail: 'The title and slug create the public article URL. The hero image is also used by article cards and social previews when no override is set.',
    },
    {
      key: 'required-content',
      label: 'Body content includes at least one real block',
      done: hasMeaningfulFeatureBody(document.content),
      kind: 'required',
      detail: 'Add the article body in Main Content. Empty paragraphs do not count; use real text, images, quotes, results, references, or other supported blocks.',
    },
    {
      key: 'required-credits',
      label: 'Authors, contributors, or special thanks are configured',
      done: hasFeaturePeople(document),
      kind: 'required',
      detail: 'Add at least one person in Extra Content so published articles have clear authorship or contributor credit.',
    },
    {
      key: 'required-references',
      label: 'References are present when the article uses citations',
      done: !hasFeatureCitations(document.content) || hasFeatureReferences(document.content),
      kind: 'required',
      detail: 'If the body uses citation marks, add a References block near the end of Main Content. Articles without citations automatically pass this check.',
    },
  ]

  const optionalItems: ChecklistItem[] = [
    {
      key: 'optional-seo',
      label: 'SEO meta description is added',
      done: Boolean(document.metaDescription?.trim()),
      kind: 'optional',
      detail: 'Aim for about 140-160 characters. Write a clear summary with the article topic and value, not a pile of keywords.',
    },
    {
      key: 'optional-card-summary',
      label: 'Listing card description is added',
      done: Boolean(document.description?.trim()),
      kind: 'optional',
      detail: 'Use one or two short sentences that help someone decide whether to open the article from the Vision listing.',
    },
    {
      key: 'optional-categories',
      label: 'Categories and display date are set when useful',
      done: Boolean((document.categories?.length ?? 0) > 0 || document.date?.trim()),
      kind: 'optional',
      detail: 'Categories help with scanning and future filtering. Add a display date when the piece is time-sensitive or part of a dated publication flow.',
    },
  ]

  const items = [...requiredItems, ...optionalItems].sort((left, right) => {
    const rank = (item: ChecklistItem) => {
      if (!item.done && item.kind === 'required') return 0
      if (!item.done) return 1
      if (item.kind === 'required') return 2
      return 3
    }

    return rank(left) - rank(right)
  })

  return (
    <Card border padding={4} radius={2}>
      <Stack space={3}>
        <Stack space={2}>
        {items.map((item) => (
          <Card
            key={item.label}
            border
            padding={3}
            radius={2}
            tone={item.done ? 'positive' : 'default'}
            style={{ cursor: 'pointer' }}
            tabIndex={0}
            onClick={() => setOpenItemKey((current) => (current === item.key ? null : item.key))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setOpenItemKey((current) => (current === item.key ? null : item.key))
              }
            }}
          >
            <Stack space={3}>
              <Flex align="flex-start" gap={3}>
                <Badge tone={item.done ? 'positive' : item.kind === 'optional' ? 'caution' : 'default'}>
                  {item.done ? 'Done' : item.kind === 'optional' ? 'Optional' : 'Todo'}
                </Badge>
                <Text size={1}>{item.label}</Text>
              </Flex>
              {openItemKey === item.key && (
                <Text muted size={1}>
                  {item.detail}
                </Text>
              )}
            </Stack>
          </Card>
        ))}
        </Stack>
      </Stack>
    </Card>
  )
}

export function ContentWidthInput(props: StringInputProps) {
  const { onChange, renderDefault, value } = props
  const selectedValue = value || 'medium'

  useEffect(() => {
    if (!value) {
      onChange(PatchEvent.from(set('medium')))
    }
  }, [onChange, value])

  return renderDefault({ ...props, value: selectedValue })
}

type ResultVariant = 'row' | 'stacked' | 'statBand' | 'legacyRow' | 'grid'
type ResultsBlockValue = {
  variant?: ResultVariant
}
type DataTableBlockValue = {
  sourceData?: string
  delimiter?: DataTableDelimiter
  useFirstRowAsHeader?: boolean
}

const RESULT_VARIANT_CARDS: Array<{
  value: ResultVariant
  title: string
  description: string
  sample: ReactNode
  publicOption: boolean
}> = [
  {
    value: 'row',
    title: 'Standard stats row',
    description: 'Best default for 2-4 headline metrics.',
    publicOption: true,
    sample: (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {['48%', '2x', '14'].map((value) => (
          <div key={value} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 6, background: '#f9fafb' }}>
            <div style={{ fontFamily: 'serif', fontSize: 24, color: '#b84a0e' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Supporting label</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    value: 'statBand',
    title: 'Stat band',
    description: 'Use for larger side-by-side metrics, often near the top of an article.',
    publicOption: true,
    sample: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontFamily: 'serif', fontSize: 28, color: '#111827' }}>990 M</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>face-to-face visits</div>
        </div>
        <div style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontFamily: 'serif', fontSize: 28, color: '#111827' }}>459 M (46%)</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>can go virtual</div>
        </div>
      </div>
    ),
  },
  {
    value: 'stacked',
    title: 'Stacked stats',
    description: 'Use when you want one metric per row with more vertical breathing room.',
    publicOption: true,
    sample: (
      <div style={{ display: 'grid', gap: 8 }}>
        {['48%', '2x'].map((value) => (
          <div key={value} style={{ padding: '10px 12px', borderRadius: 6, background: '#f9fafb' }}>
            <div style={{ fontFamily: 'serif', fontSize: 24, color: '#b84a0e' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Supporting label</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    value: 'legacyRow',
    title: 'Legacy row',
    description: 'Still renders older content but is not offered for new authoring.',
    publicOption: false,
    sample: null,
  },
  {
    value: 'grid',
    title: 'Legacy grid',
    description: 'Still renders older content but is not offered for new authoring.',
    publicOption: false,
    sample: null,
  },
]

export function ResultsBlockInput(props: ObjectInputProps<ResultsBlockValue>) {
  const currentVariant = (props.value?.variant || 'row') as ResultVariant
  const selectedCard = RESULT_VARIANT_CARDS.find((card) => card.value === currentVariant)

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={cardStyles('#007385')}>
        <strong style={{ display: 'block', marginBottom: 6, fontSize: '14px' }}>Stats block layouts</strong>
        <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.6, color: '#4b5563' }}>
          Choose one of the supported layouts below, then fill in each stat and description. Legacy layouts still render older content, but they are not part of the normal authoring path.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {RESULT_VARIANT_CARDS.filter((card) => card.publicOption).map((card) => (
            <div
              key={card.value}
              style={{
                border: `2px solid ${card.value === currentVariant ? '#007385' : '#d1d5db'}`,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: '13px' }}>{card.title}</strong>
                {card.value === currentVariant && statusPill('Selected', 'good')}
              </div>
              <div style={{ marginBottom: 8 }}>{card.sample}</div>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#6b7280' }}>{card.description}</p>
            </div>
          ))}
        </div>
        {selectedCard && !selectedCard.publicOption && (
          <p style={{ margin: '12px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#9a3412' }}>
            This block is using <strong>{selectedCard.title}</strong>. It will keep rendering, but new stats blocks should be switched to one of the supported presets above when practical.
          </p>
        )}
      </div>
      {props.renderDefault(props)}
    </div>
  )
}

export function DataTableBlockInput(props: ObjectInputProps<DataTableBlockValue>) {
  const source = typeof props.value?.sourceData === 'string' ? props.value.sourceData : ''
  const delimiter = props.value?.delimiter || 'auto'
  const previewRows = parseDataTableSource(source, delimiter).slice(0, 5)
  const headerEnabled = props.value?.useFirstRowAsHeader !== false
  const headerRow = headerEnabled ? previewRows[0] : undefined
  const bodyRows = headerEnabled ? previewRows.slice(1) : previewRows

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={cardStyles('#007385')}>
        <strong style={{ display: 'block', marginBottom: 6, fontSize: '14px' }}>Import table data</strong>
        <p style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: 1.6, color: '#4b5563' }}>
          Paste CSV or TSV data into <strong>Source Data</strong>. Use tabs when copying directly from a spreadsheet. The first row becomes the header when <strong>Use First Row as Header</strong> is enabled.
        </p>
        <p style={{ margin: '0 0 12px', fontSize: '12px', lineHeight: 1.5, color: '#6b7280' }}>
          Best for editorial tables, benchmarks, comparisons, schedules, and summary data. Turn on striped rows to match the Gatsby-style alternating table treatment.
        </p>
        {previewRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              {headerRow && (
                <thead>
                  <tr>
                    {headerRow.map((cell, index) => (
                      <th
                        key={`header-${index}`}
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          borderBottom: '1px solid #d1d5db',
                        }}
                      >
                        {cell || `Column ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {bodyRows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`cell-${rowIndex}-${cellIndex}`}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#6b7280' }}>
            No rows detected yet. Paste two or more lines of CSV/TSV data to preview the import.
          </p>
        )}
      </div>
      {props.renderDefault(props)}
    </div>
  )
}
