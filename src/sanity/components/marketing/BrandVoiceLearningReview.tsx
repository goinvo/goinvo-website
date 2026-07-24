import { useEffect, useId, useMemo, useState } from 'react'

import type {
  BrandVoiceLearningProposal,
  BrandVoiceLearningSelection,
} from '../../../lib/marketing/brandVoiceLearning'

export interface BrandVoiceLearningReviewProps {
  proposal: BrandVoiceLearningProposal
  applying?: boolean
  error?: string | null
  onApply: (selection: BrandVoiceLearningSelection) => void | Promise<void>
  onDismiss: () => void
}

const confidenceLabels: Record<BrandVoiceLearningProposal['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

const confidenceColors: Record<
  BrandVoiceLearningProposal['confidence'],
  { background: string; border: string; color: string }
> = {
  high: { background: '#ecf8f1', border: '#8ac5a2', color: '#17633a' },
  medium: { background: '#fff6df', border: '#d9b96b', color: '#74520b' },
  low: { background: '#f8eeee', border: '#d5a0a0', color: '#7a2c2c' },
}

const buttonStyle = {
  borderRadius: 7,
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  minHeight: 44,
  padding: '8px 14px',
} as const

const checkboxRowStyle = {
  alignItems: 'flex-start',
  cursor: 'pointer',
  display: 'flex',
  gap: 9,
  lineHeight: 1.45,
  minHeight: 32,
  padding: '5px 0',
} as const

/**
 * Starts with only additive rules selected. Full guidance replacement and a
 * representative-example set always require an extra explicit opt-in, while
 * low-confidence proposals start completely empty.
 */
export function defaultBrandVoiceLearningSelection(
  proposal: BrandVoiceLearningProposal,
): BrandVoiceLearningSelection {
  if (proposal.confidence === 'low') {
    return { guidance: false, do: [], avoid: [], examples: false }
  }

  return {
    guidance: false,
    do: [...proposal.doAdditions],
    avoid: [...proposal.avoidAdditions],
    examples: false,
  }
}

function hasSelection(selection: BrandVoiceLearningSelection) {
  return (
    selection.guidance ||
    selection.do.length > 0 ||
    selection.avoid.length > 0 ||
    selection.examples
  )
}

function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

export function BrandVoiceLearningReview({
  proposal,
  applying = false,
  error = null,
  onApply,
  onDismiss,
}: BrandVoiceLearningReviewProps) {
  const headingId = useId()
  const descriptionId = useId()
  const [selection, setSelection] = useState<BrandVoiceLearningSelection>(() =>
    defaultBrandVoiceLearningSelection(proposal),
  )

  useEffect(() => {
    setSelection(defaultBrandVoiceLearningSelection(proposal))
  }, [proposal])

  const examples = useMemo(() => proposal.curatedExamples.slice(0, 6), [proposal.curatedExamples])
  const canApply = hasSelection(selection) && !applying
  const hasProposedLearning = Boolean(
    proposal.guidanceReplacement ||
      proposal.doAdditions.length ||
      proposal.avoidAdditions.length ||
      examples.length,
  )
  const tone = confidenceColors[proposal.confidence]

  const toggleListItem = (field: 'do' | 'avoid', value: string, checked: boolean) => {
    setSelection((current) => ({
      ...current,
      [field]: checked
        ? current[field].includes(value)
          ? current[field]
          : [...current[field], value]
        : current[field].filter((item) => item !== value),
    }))
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      data-brand-voice-learning-review="true"
      style={{
        background: 'var(--card-bg-color, #fff)',
        border: '1px solid var(--card-border-color, #d8d8d8)',
        borderRadius: 10,
        color: 'var(--card-fg-color, #222)',
        display: 'grid',
        gap: 14,
        maxWidth: '100%',
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h3 id={headingId} style={{ fontSize: 16, margin: 0 }}>
            Voice learning proposal for {proposal.voice.name}
          </h3>
          <p id={descriptionId} style={{ color: 'var(--card-muted-fg-color, #5d5d5d)', fontSize: 13, lineHeight: 1.5, margin: '4px 0 0' }}>
            Review what this edit may teach the voice. Only the items you select will affect future drafts;
            your current document will not change. Brand voices are publish-safe shared settings, so never approve
            private names, contact details, client facts, prices, or unsupported claims here.
          </p>
        </div>
        <span
          aria-label={`Proposal confidence: ${proposal.confidence}`}
          style={{
            alignSelf: 'flex-start',
            background: tone.background,
            border: `1px solid ${tone.border}`,
            borderRadius: 999,
            color: tone.color,
            fontSize: 12,
            fontWeight: 800,
            padding: '5px 9px',
            whiteSpace: 'nowrap',
          }}
        >
          {confidenceLabels[proposal.confidence]}
        </span>
      </div>

      <div
        style={{
          background: 'rgba(0, 115, 133, 0.08)',
          borderRadius: 7,
          fontSize: 13,
          lineHeight: 1.5,
          padding: '9px 10px',
        }}
      >
        <strong>What changed:</strong> {proposal.summary}
        {proposal.changedFields.length > 0 ? (
          <div style={{ color: 'var(--card-muted-fg-color, #666)', fontSize: 12, marginTop: 3 }}>
            Compared fields: {proposal.changedFields.map(titleCase).join(', ')}
          </div>
        ) : null}
      </div>

      {proposal.confidence === 'low' ? (
        <div
          role="note"
          style={{
            background: tone.background,
            border: `1px solid ${tone.border}`,
            borderRadius: 7,
            color: tone.color,
            fontSize: 13,
            lineHeight: 1.5,
            padding: '9px 10px',
          }}
        >
          {hasProposedLearning
            ? 'Nothing is preselected because this edit may be factual or too specific to generalize. Select only a principle you want repeated across future work.'
            : 'No reusable voice principle was found. The edit may be factual, too specific, or too small to generalize; dismiss this proposal and keep the wording change.'}
        </div>
      ) : null}

      {proposal.guidanceReplacement ? (
        <fieldset style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 800, padding: 0 }}>Voice guidance</legend>
          <label style={checkboxRowStyle}>
            <input
              aria-label="Use proposed voice guidance"
              checked={selection.guidance}
              disabled={applying}
              onChange={(event) =>
                setSelection((current) => ({ ...current, guidance: event.currentTarget.checked }))
              }
              style={{ flex: '0 0 auto', height: 18, margin: '1px 0 0', width: 18 }}
              type="checkbox"
            />
            <span>
              <strong>Use this general guidance</strong>
              <span style={{ display: 'block', marginTop: 3 }}>{proposal.guidanceReplacement}</span>
            </span>
          </label>
        </fieldset>
      ) : null}

      {proposal.doAdditions.length > 0 || proposal.avoidAdditions.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
          }}
        >
          {proposal.doAdditions.length > 0 ? (
            <fieldset style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}>
              <legend style={{ fontSize: 13, fontWeight: 800, padding: 0 }}>Do in future drafts</legend>
              {proposal.doAdditions.map((item, index) => (
                <label key={`${item}-${index}`} style={checkboxRowStyle}>
                  <input
                    aria-label={`Learn do principle: ${item}`}
                    checked={selection.do.includes(item)}
                    disabled={applying}
                    onChange={(event) => toggleListItem('do', item, event.currentTarget.checked)}
                    style={{ flex: '0 0 auto', height: 18, margin: '1px 0 0', width: 18 }}
                    type="checkbox"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {proposal.avoidAdditions.length > 0 ? (
            <fieldset style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}>
              <legend style={{ fontSize: 13, fontWeight: 800, padding: 0 }}>Avoid in future drafts</legend>
              {proposal.avoidAdditions.map((item, index) => (
                <label key={`${item}-${index}`} style={checkboxRowStyle}>
                  <input
                    aria-label={`Learn avoid principle: ${item}`}
                    checked={selection.avoid.includes(item)}
                    disabled={applying}
                    onChange={(event) => toggleListItem('avoid', item, event.currentTarget.checked)}
                    style={{ flex: '0 0 auto', height: 18, margin: '1px 0 0', width: 18 }}
                    type="checkbox"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
      ) : null}

      {examples.length > 0 ? (
        <fieldset
          data-representative-example-set="true"
          style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}
        >
          <legend style={{ fontSize: 13, fontWeight: 800, padding: 0 }}>Representative examples</legend>
          <label style={checkboxRowStyle}>
            <input
              aria-label="Replace saved representative examples with exactly the displayed set"
              checked={selection.examples}
              disabled={applying}
              onChange={(event) =>
                setSelection((current) => ({ ...current, examples: event.currentTarget.checked }))
              }
              style={{ flex: '0 0 auto', height: 18, margin: '1px 0 0', width: 18 }}
              type="checkbox"
            />
            <span>
              <strong>Replace saved examples with this exact set</strong>
              <span style={{ color: 'var(--card-muted-fg-color, #666)', display: 'block', fontSize: 12, marginTop: 2 }}>
                Approving replaces the voice&rsquo;s existing examples with exactly the set shown below. Saved
                snippets not shown here will be removed. Leave this unchecked to keep the current examples.
                The proposed set contains at most six diverse snippets.
              </span>
            </span>
          </label>

          <div style={{ display: 'grid', gap: 8, marginTop: 5 }}>
            {examples.map((example, index) => (
              <article
                data-representative-example="true"
                key={`${example.text}-${index}`}
                style={{
                  background: 'rgba(0, 115, 133, 0.04)',
                  border: '1px solid var(--card-border-color, #e3e3e3)',
                  borderRadius: 7,
                  minWidth: 0,
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  &ldquo;{example.text}&rdquo;
                </div>
                {example.principles.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                    {example.principles.slice(0, 3).map((principle) => (
                      <span
                        key={principle}
                        style={{
                          background: '#edf4f5',
                          borderRadius: 999,
                          color: '#24434d',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 7px',
                        }}
                      >
                        {principle}
                      </span>
                    ))}
                  </div>
                ) : null}
                {example.reason ? (
                  <div style={{ color: 'var(--card-muted-fg-color, #666)', fontSize: 12, lineHeight: 1.45, marginTop: 6 }}>
                    Why it belongs: {example.reason}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div aria-live="polite">
        {error ? (
          <div role="alert" style={{ color: '#a13a32', fontSize: 13, marginBottom: 8 }}>
            {error}
          </div>
        ) : null}
        {applying ? (
          <div role="status" style={{ color: 'var(--card-muted-fg-color, #666)', fontSize: 13, marginBottom: 8 }}>
            Applying the selected learning to future drafts…
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
        <button
          disabled={applying}
          onClick={onDismiss}
          style={{
            ...buttonStyle,
            background: 'var(--card-bg-color, #fff)',
            border: '1px solid var(--card-border-color, #a8a8a8)',
            color: 'var(--card-fg-color, #333)',
          }}
          type="button"
        >
          Dismiss proposal
        </button>
        <button
          type="button"
          aria-busy={applying}
          disabled={!canApply}
          onClick={() => void onApply(selection)}
          style={{
            ...buttonStyle,
            background: canApply ? '#24434d' : '#d7dcde',
            border: '1px solid transparent',
            color: canApply ? '#fff' : '#687276',
            cursor: canApply ? 'pointer' : 'not-allowed',
          }}
        >
          {applying ? 'Applying learning…' : 'Apply selected learning'}
        </button>
      </div>
    </section>
  )
}
