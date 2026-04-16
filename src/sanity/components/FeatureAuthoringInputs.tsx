import type { ReactNode } from 'react'
import type { InputProps, ObjectInputProps } from 'sanity'
import { useFormValue } from 'sanity'
import { parseDataTableSource } from '@/lib/dataTable'
import {
  getFeatureEditorExperience,
  getFeatureEditorExperienceDescription,
  getFeatureEditorExperienceLabel,
  hasFeatureCitations,
  hasFeaturePeople,
  hasFeatureReferences,
  hasMeaningfulFeatureBody,
} from '@/lib/featureAuthoring'

type FeatureDocumentValue = {
  title?: string
  slug?: { current?: string }
  image?: unknown
  content?: any[]
  authors?: unknown[]
  contributors?: unknown[]
  specialThanks?: unknown[]
  previewReviewed?: boolean
}

function cardStyles(accent: string) {
  return {
    border: `1px solid ${accent}`,
    borderRadius: '8px',
    padding: '14px 16px',
    background: '#fff',
  } as const
}

function statusPill(label: string, tone: 'neutral' | 'good' | 'warn') {
  const palette = {
    neutral: { bg: '#f3f4f6', text: '#374151' },
    good: { bg: '#e8f7ee', text: '#166534' },
    warn: { bg: '#fff3e8', text: '#9a3412' },
  }[tone]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '999px',
        padding: '2px 8px',
        background: palette.bg,
        color: palette.text,
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}

export function FeatureAuthoringStatusInput(_props: InputProps) {
  const document = (useFormValue([]) || {}) as FeatureDocumentValue
  const slug = document.slug?.current
  const experience = getFeatureEditorExperience(slug)

  const accent =
    experience === 'static-override' ? '#d97706' :
      experience === 'code-assisted' ? '#007385' :
        '#166534'

  const title =
    experience === 'static-override' ? 'Static override detected' :
      experience === 'code-assisted' ? 'Legacy compatibility article' :
        'Guided CMS article'

  return (
    <div style={cardStyles(accent)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <strong style={{ fontSize: '14px' }}>{title}</strong>
        {statusPill(getFeatureEditorExperienceLabel(slug), experience === 'guided' ? 'good' : 'warn')}
      </div>
      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: '#4b5563' }}>
        {slug
          ? getFeatureEditorExperienceDescription(slug)
          : 'Generate a slug first. New feature articles use the guided CMS path by default, and the Studio will warn you if you pick a slug that is still controlled by code.'}
      </p>
      {experience === 'static-override' && slug && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#9a3412' }}>
          Live page source: <code>{`src/app/(main)/vision/${slug}/page.tsx`}</code>
        </p>
      )}
      {experience === 'code-assisted' && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#0f4c55' }}>
          Safe rule for editors: use this page for content updates, but do not treat its formatting behavior as the model for new articles.
        </p>
      )}
    </div>
  )
}

export function FeaturePublishingChecklistInput(_props: InputProps) {
  const document = (useFormValue([]) || {}) as FeatureDocumentValue
  const slug = document.slug?.current
  const experience = getFeatureEditorExperience(slug)

  if (experience === 'static-override') {
    return (
      <div style={cardStyles('#d97706')}>
        <strong style={{ display: 'block', marginBottom: 6, fontSize: '14px' }}>Publishing checklist</strong>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: '#4b5563' }}>
          This document still powers a code-rendered page. Use this entry for metadata and reference only, then review the live route directly after any code-side change.
        </p>
      </div>
    )
  }

  const items = [
    {
      label: 'Title, slug, and hero image are set',
      done: Boolean(document.title && slug && document.image),
    },
    {
      label: 'Body content includes at least one real block',
      done: hasMeaningfulFeatureBody(document.content),
    },
    {
      label: 'Authors, contributors, or special thanks are configured',
      done: hasFeaturePeople(document),
    },
    {
      label: 'References are present when the article uses citations',
      done: !hasFeatureCitations(document.content) || hasFeatureReferences(document.content),
    },
    {
      label: 'Draft preview has been reviewed in the Presentation tab',
      done: Boolean(document.previewReviewed),
    },
  ]

  return (
    <div style={cardStyles('#007385')}>
      <strong style={{ display: 'block', marginBottom: 8, fontSize: '14px' }}>Publishing checklist</strong>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 6,
              background: item.done ? '#e8f7ee' : '#f9fafb',
              border: `1px solid ${item.done ? '#86efac' : '#e5e7eb'}`,
            }}
          >
            <span style={{ fontSize: 12, lineHeight: 1.4, fontWeight: 700 }}>{item.done ? 'DONE' : 'TODO'}</span>
            <span style={{ fontSize: '13px', lineHeight: 1.5, color: '#374151' }}>{item.label}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#4b5563' }}>
        Tip: after checking the draft in Presentation, toggle <strong>Draft preview reviewed</strong> below so collaborators know this article is ready to publish.
      </p>
    </div>
  )
}

type ResultVariant = 'row' | 'stacked' | 'statBand' | 'legacyRow' | 'grid'

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
            <div style={{ fontFamily: 'serif', fontSize: 24, color: '#E36216' }}>{value}</div>
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
            <div style={{ fontFamily: 'serif', fontSize: 24, color: '#E36216' }}>{value}</div>
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

export function ResultsBlockInput(props: ObjectInputProps<Record<string, any>>) {
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
                background: card.value === currentVariant ? '#f0fbfc' : '#fff',
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

export function DataTableBlockInput(props: ObjectInputProps<Record<string, any>>) {
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
                          background: '#f9fafb',
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
                          background: rowIndex % 2 === 0 ? '#f9f9f9' : '#fff',
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
