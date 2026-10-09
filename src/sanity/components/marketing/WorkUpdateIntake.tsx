import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'

import { requestMarketingAssist } from './marketingAssistRequest'
import { LatestExclusiveRequestGate } from './asyncRequestGate'
import { findWorkUpdatePrivacyIssue } from '@/lib/marketing/workUpdateSafety'
import {
  MARKETER_BRIEF_MAX_LENGTH,
  buildMarketerBriefAssistPayload,
  findReusableMarketerBriefProject,
  normalizeMarketerBriefProject,
  type MarketerBriefAssistResponse,
  type MarketerBriefHandoffResult,
  type MarketerBriefProject,
  type MarketerBriefProposal,
  type MarketerBriefReuseMatch,
} from './marketerBrief'

const styles = {
  form: {
    display: 'grid',
    gap: 10,
    marginTop: 16,
    padding: 16,
    border: '1px solid var(--card-border-color)',
    borderRadius: 10,
    background: 'rgba(0, 115, 133, 0.055)',
  },
  label: { fontSize: 14, fontWeight: 800 },
  textarea: {
    width: '100%',
    minHeight: 96,
    resize: 'vertical',
    border: '1px solid var(--card-border-color)',
    borderRadius: 8,
    padding: '11px 12px',
    color: 'var(--card-fg-color)',
    background: 'var(--card-bg-color)',
    font: 'inherit',
    lineHeight: 1.5,
  },
  small: { fontSize: 12, lineHeight: 1.5, color: 'var(--card-muted-fg-color)' },
  primaryButton: {
    minHeight: 42,
    border: '1px solid #007385',
    borderRadius: 7,
    padding: '8px 13px',
    background: '#007385',
    color: '#fff',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 800,
  },
  button: {
    minHeight: 42,
    border: '1px solid var(--card-border-color)',
    borderRadius: 7,
    padding: '8px 13px',
    background: 'transparent',
    color: 'var(--card-fg-color)',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 750,
  },
  review: {
    display: 'grid',
    gap: 14,
    marginTop: 12,
    borderTop: '1px solid var(--card-border-color)',
    paddingTop: 16,
  },
  callout: {
    border: '1px solid rgba(0, 115, 133, 0.4)',
    borderRadius: 8,
    padding: 12,
    background: 'rgba(0, 115, 133, 0.08)',
  },
  warning: {
    border: '1px solid rgba(227, 98, 22, 0.42)',
    borderRadius: 8,
    padding: 11,
    background: 'rgba(227, 98, 22, 0.08)',
    fontSize: 12,
    lineHeight: 1.5,
  },
  list: { margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 4 },
} satisfies Record<string, CSSProperties>

export function WorkUpdateIntake({
  existingProjects,
  onAdopt,
  onOpenOperations,
  onOpenResearch,
  onDraftStateChange,
  requestAssist = requestMarketingAssist,
}: {
  existingProjects: MarketerBriefProject[]
  onAdopt: (proposal: MarketerBriefProposal, reuseMatch: MarketerBriefReuseMatch | null) => Promise<MarketerBriefHandoffResult>
  onOpenOperations: (result: MarketerBriefHandoffResult) => void
  onOpenResearch?: (result: MarketerBriefHandoffResult) => void
  onDraftStateChange?: (dirty: boolean) => void
  requestAssist?: typeof requestMarketingAssist
}) {
  const [update, setUpdate] = useState('')
  const [proposal, setProposal] = useState<MarketerBriefProposal | null>(null)
  const [usedAi, setUsedAi] = useState<boolean | null>(null)
  const [editingBrief, setEditingBrief] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [adopting, setAdopting] = useState(false)
  const [error, setError] = useState('')
  const [handoffResult, setHandoffResult] = useState<MarketerBriefHandoffResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const reviewHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const successHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const updateRef = useRef('')
  const analysisGateRef = useRef(new LatestExclusiveRequestGate<'analysis'>())
  const adoptionPendingRef = useRef(false)
  const mountedRef = useRef(true)

  const normalized = useMemo(() => (proposal ? normalizeMarketerBriefProject(proposal) : null), [proposal])
  const reuseMatch = useMemo(
    () => (proposal ? findReusableMarketerBriefProject(existingProjects, proposal) : null),
    [existingProjects, proposal],
  )

  useEffect(() => {
    onDraftStateChange?.(Boolean(update.trim()) && !handoffResult)
  }, [handoffResult, onDraftStateChange, update])

  useEffect(() => {
    const analysisGate = analysisGateRef.current
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      analysisGate.cancel()
      adoptionPendingRef.current = false
    }
  }, [])

  const cancelPendingAnalysis = () => {
    analysisGateRef.current.cancel()
    setAnalyzing(false)
  }

  const resetForAnotherUpdate = () => {
    cancelPendingAnalysis()
    updateRef.current = ''
    setUpdate('')
    setProposal(null)
    setUsedAi(null)
    setError('')
    setHandoffResult(null)
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const reviseUpdate = () => {
    if (adoptionPendingRef.current) return
    setProposal(null)
    setUsedAi(null)
    setError('')
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const analyzeUpdate = async (event: FormEvent) => {
    event.preventDefault()
    if (proposal || handoffResult) return
    const trimmed = update.trim()
    if (trimmed.length < 12 || analysisGateRef.current.pending || adoptionPendingRef.current) return
    const privacyIssue = findWorkUpdatePrivacyIssue(trimmed)
    if (privacyIssue) {
      setError(privacyIssue.message)
      setProposal(null)
      setHandoffResult(null)
      return
    }
    const requestTicket = analysisGateRef.current.begin('analysis', trimmed)
    if (!requestTicket) return
    setAnalyzing(true)
    setError('')
    setProposal(null)
    setHandoffResult(null)
    try {
      const payload = await requestAssist<MarketerBriefAssistResponse>(
        buildMarketerBriefAssistPayload(trimmed),
      )
      if (!analysisGateRef.current.isCurrent(requestTicket) || updateRef.current.trim() !== trimmed) return
      if (!payload.suggestion?.researchProject) {
        throw new Error('Marqueta could not turn that update into a safe working brief. Add a little more context and try again.')
      }
      setEditingBrief(false)
      setProposal(payload.suggestion)
      setUsedAi(Boolean(payload.usedAi))
      window.setTimeout(() => reviewHeadingRef.current?.focus(), 0)
    } catch (analysisError) {
      if (!analysisGateRef.current.isCurrent(requestTicket)) return
      setError(analysisError instanceof Error ? analysisError.message : 'Marqueta could not analyze this update.')
    } finally {
      if (analysisGateRef.current.finish(requestTicket) && mountedRef.current) {
        setAnalyzing(false)
      }
    }
  }

  const adoptProposal = async () => {
    if (!proposal || adoptionPendingRef.current) return
    adoptionPendingRef.current = true
    setAdopting(true)
    setError('')
    try {
      const result = await onAdopt(proposal, reuseMatch)
      if (!mountedRef.current) return
      setHandoffResult(result)
      window.setTimeout(() => successHeadingRef.current?.focus(), 0)
    } catch (handoffError) {
      if (!mountedRef.current) return
      setError(handoffError instanceof Error ? handoffError.message : 'Marqueta could not save this handoff.')
    } finally {
      adoptionPendingRef.current = false
      if (mountedRef.current) setAdopting(false)
    }
  }

  const briefPreview = normalized?.brief
    ? normalized.brief.length > 260
      ? normalized.brief.slice(0, 260).replace(/\s+\S*$/, '') + '…'
      : normalized.brief
    : ''

  return (
    <form data-work-update-intake="true" style={styles.form} onSubmit={analyzeUpdate} aria-busy={analyzing || adopting}>
      {!proposal && !handoffResult && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
            <label htmlFor="marketing-work-update" style={styles.label}>What’s new?</label>
            <span id="marketing-work-update-count" style={styles.small}>{update.length}/{MARKETER_BRIEF_MAX_LENGTH}</span>
          </div>
          <textarea
            ref={textareaRef}
            id="marketing-work-update"
            value={update}
            maxLength={MARKETER_BRIEF_MAX_LENGTH}
            rows={3}
            aria-describedby={`marketing-work-update-help marketing-work-update-safety marketing-work-update-count${error ? ' marketing-work-update-error' : ''}`}
            aria-invalid={Boolean(error)}
            disabled={adopting}
            placeholder="Example: We have a new guide to clearer health information. Help us turn it into two short posts."
            style={styles.textarea}
            onChange={(event) => {
              const nextUpdate = event.currentTarget.value
              updateRef.current = nextUpdate
              setUpdate(nextUpdate)
              if (analysisGateRef.current.pending) cancelPendingAnalysis()
              setUsedAi(null)
              setError('')
            }}
          />
          <div id="marketing-work-update-help" style={styles.small}>Messy notes are fine. You’ll review the brief before saving.</div>
          <div id="marketing-work-update-safety" style={styles.small}>AI reads this update. Leave out confidential client, personal and login information.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" style={styles.primaryButton} disabled={update.trim().length < 12 || analyzing || adopting}>
              {analyzing ? 'Preparing your brief…' : 'Draft a brief'}
            </button>
            <span data-work-update-review-note="true" style={styles.small}>Nothing is saved yet.</span>
          </div>
          <details><summary style={{ minHeight: 36, cursor: 'pointer', ...styles.small }}>About AI and privacy</summary>
            <p style={styles.small}>Your update is sent to the approved AI model to prepare a brief. Only the brief you choose to save is stored in Marketing’s private workspace; the raw update is not saved there. Keep confidential client, contact, health, credential and private-lead data out.</p>
          </details>
        </>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" style={styles.small}>
        {analyzing ? 'Preparing a brief for you to review…' : ''}
      </div>
      {error && <div id="marketing-work-update-error" role="alert" style={styles.warning}><strong>Couldn’t complete that step.</strong><div style={{ marginTop: 3 }}>{error}</div></div>}

      {proposal && normalized && !handoffResult && (
        <section aria-labelledby="marketing-work-update-review-title" style={{ ...styles.review, marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <div>
            <h3 ref={reviewHeadingRef} id="marketing-work-update-review-title" tabIndex={-1} style={{ margin: 0, fontSize: 20 }}>Review your brief</h3>
            <div style={{ ...styles.small, marginTop: 4 }}>{usedAi ? 'AI draft. Check the wording and sources.' : 'AI is unavailable. This draft uses basic rules; check it carefully.'}</div>
          </div>
          {editingBrief ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={styles.label}>Title
                <input autoFocus maxLength={180} value={proposal.researchProject?.title || ''} disabled={adopting} style={{ ...styles.textarea, minHeight: 42, marginTop: 5 }} onChange={(event) => setProposal({ ...proposal, researchProject: { ...proposal.researchProject, title: event.currentTarget.value } })} />
              </label>
              <label style={styles.label}>Brief
                <textarea rows={5} maxLength={1400} value={proposal.researchProject?.brief || ''} disabled={adopting} style={{ ...styles.textarea, marginTop: 5 }} onChange={(event) => setProposal({ ...proposal, researchProject: { ...proposal.researchProject, brief: event.currentTarget.value } })} />
              </label>
              <label style={styles.label}>Audience
                <input maxLength={700} value={proposal.researchProject?.audience || ''} disabled={adopting} style={{ ...styles.textarea, minHeight: 42, marginTop: 5 }} onChange={(event) => setProposal({ ...proposal, researchProject: { ...proposal.researchProject, audience: event.currentTarget.value } })} />
              </label>
            </div>
          ) : (
            <div data-work-update-summary="true">
              <strong style={{ display: 'block', fontSize: 16 }}>{normalized.title}</strong>
              {briefPreview && <p style={{ margin: '7px 0 0', lineHeight: 1.55 }}>{briefPreview}</p>}
              {normalized.audience && <div style={{ ...styles.small, marginTop: 8 }}><strong>Audience: </strong>{normalized.audience}</div>}
            </div>
          )}
          <div style={styles.small}>Saving adds a private work item and checks existing GoInvo content. Nothing is published.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={styles.primaryButton} disabled={adopting || !normalized.title.trim() || !normalized.brief.trim()} onClick={() => void adoptProposal()}>{adopting ? 'Saving brief…' : 'Save brief'}</button>
            <button type="button" style={styles.button} disabled={adopting} aria-pressed={editingBrief} onClick={() => setEditingBrief((editing) => !editing)}>{editingBrief ? 'Done editing' : 'Edit brief'}</button>
          </div>
          <details data-work-update-full-brief="true">
            <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>Full brief, sources and assumptions</summary>
            <div style={{ display: 'grid', gap: 10, marginTop: 9 }}>
              <div><strong>Full brief</strong><p style={{ margin: '5px 0 0', lineHeight: 1.55 }}>{normalized.brief}</p></div>
              {normalized.goals.length > 0 && (
                <div><strong>Goals</strong><ul style={styles.list}>{normalized.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul></div>
              )}
              {reuseMatch && <div style={styles.small}>Existing source: <strong>{reuseMatch.project.title || normalized.title}</strong> ({reuseMatch.reason}). This source will not be changed.</div>}
              <div><strong>Your original update</strong><p style={{ ...styles.small, whiteSpace: 'pre-wrap' }}>{update}</p><button type="button" style={styles.button} disabled={adopting} onClick={reviseUpdate}>Change the original update</button></div>
              {(proposal.rationale || []).length > 0 && (
                <ul style={styles.list}>
                  {(proposal.rationale || []).slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
              {normalized.researchQuestions.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13 }}>Questions to check</strong>
                  <ul style={styles.list}>
                    {normalized.researchQuestions.slice(0, 4).map((question) => (
                      <li key={question._key}>{question.question}</li>
                    ))}
                  </ul>
                </div>
              )}
              {normalized.collaborators.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13 }}>People and timing</strong>
                  <ul style={styles.list}>
                    {normalized.collaborators.slice(0, 6).map((collaborator) => {
                      const identity = [collaborator.name, collaborator.organization].filter(Boolean).join(' / ')
                      const timing = [collaborator.availabilityStart, collaborator.availabilityEnd].filter(Boolean).join(' to ')
                      const detail = [collaborator.topicArea, collaborator.expectedContribution, timing].filter(Boolean).join(' · ')
                      return (
                        <li key={collaborator._key}>
                          <strong>{identity || 'Unnamed collaborator'}</strong>{detail ? ` — ${detail}` : ''}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {normalized.canonicalUrl && (
                <div style={styles.small}>
                  <strong style={{ color: 'var(--card-fg-color)' }}>Likely destination: </strong>
                  <a href={normalized.canonicalUrl} target="_blank" rel="noreferrer">{normalized.canonicalUrl}</a>
                </div>
              )}
              {(proposal.siteReferences || []).length > 0 ? (
                <div>
                  <strong style={{ fontSize: 13 }}>Existing work it can reuse</strong>
                  <ul style={styles.list}>
                    {(proposal.siteReferences || []).slice(0, 4).map((reference, index) => (
                      <li key={`${reference.url || reference.title || 'reference'}-${index}`}>
                        {reference.url ? (
                          <a href={reference.url} target="_blank" rel="noreferrer">{reference.title || reference.url}</a>
                        ) : (reference.title || 'Existing GoInvo work')}
                        {reference.note ? ` — ${reference.note}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={styles.small}>No source match yet. Saving the brief checks existing GoInvo content.</div>
              )}
            </div>
          </details>
          <details data-work-update-save-details="true">
            <summary style={{ minHeight: 36, cursor: 'pointer', fontWeight: 750, fontSize: 13 }}>What gets saved</summary>
            <div style={{ ...styles.small, marginTop: 8 }}>
              <strong>What the handoff will do</strong>
              <p>Add one reviewed item to Marqueta’s private shared desk and run a free check of existing GoInvo content. Any matching source stays unchanged.</p>
              <p>Nothing changes until you hand this off. Marqueta never publishes, contacts anyone, approves claims, changes brand voice, deletes records, or spends paid research credits.</p>
            </div>
          </details>
        </section>
      )}

      {handoffResult && (
        <section aria-labelledby="marketing-work-update-success-title" style={{ ...styles.review, marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <div style={styles.callout}>
            <h3 ref={successHeadingRef} id="marketing-work-update-success-title" tabIndex={-1} style={{ margin: 0, fontSize: 20 }}>Brief saved</h3>
            <div style={{ marginTop: 6, lineHeight: 1.55 }}><strong>{handoffResult.title}</strong> is on Marketing’s desk. Nothing was published.</div>
            {handoffResult.createdResults > 0 && <div style={{ ...styles.small, marginTop: 7 }}>{handoffResult.createdResults} existing content match{handoffResult.createdResults === 1 ? '' : 'es'} to review.</div>}
            {handoffResult.scanWarning && <div role="alert" style={{ ...styles.small, marginTop: 7 }}>Your brief was saved, but the content check needs attention: {handoffResult.scanWarning}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={styles.primaryButton} onClick={() => onOpenOperations(handoffResult)}>Open Marketing’s desk</button>
            {handoffResult.projectId && onOpenResearch && <button type="button" style={styles.button} onClick={() => onOpenResearch(handoffResult)}>Open linked research</button>}
            <button type="button" style={styles.button} onClick={resetForAnotherUpdate}>Add another update</button>
          </div>
        </section>
      )}
    </form>
  )
}
