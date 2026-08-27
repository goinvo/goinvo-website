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

const exampleUpdate =
  'Example: We’re speaking at HIMSS in March. Priya owns the talk, the abstract is due October 2, and we want to reuse it as an article and two LinkedIn posts. The event page isn’t live yet.'

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

  return (
    <form data-work-update-intake="true" style={styles.form} onSubmit={analyzeUpdate} aria-busy={analyzing || adopting}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <label htmlFor="marketing-work-update" style={styles.label}>Work update</label>
        <span id="marketing-work-update-count" style={styles.small}>
          {update.length}/{MARKETER_BRIEF_MAX_LENGTH}
        </span>
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
        placeholder={exampleUpdate}
        style={styles.textarea}
        onChange={(event) => {
          const nextUpdate = event.currentTarget.value
          updateRef.current = nextUpdate
          setUpdate(nextUpdate)
          if (analysisGateRef.current.pending) cancelPendingAnalysis()
          if (proposal || handoffResult) {
            setProposal(null)
            setHandoffResult(null)
            setUsedAi(null)
          }
          setError('')
        }}
      />
      <div id="marketing-work-update-help" style={styles.small}>
        Messy notes are fine—no campaign, funnel, audience, owner, or content type required.
      </div>
      <div id="marketing-work-update-safety" style={{ ...styles.small, color: '#e89b67' }}>
        Keep confidential client, contact, health, login, and private-lead data out. The approved Marqueta sees this note; Sanity stores only the brief you review.
      </div>

      {!handoffResult && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="submit"
            style={styles.primaryButton}
            disabled={update.trim().length < 12 || analyzing || adopting}
          >
            {analyzing ? 'Planning marketing updates…' : 'Plan the marketing updates'}
          </button>
          <span data-work-update-review-note="true" style={styles.small}>Marqueta will show one review before saving anything.</span>
        </div>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" style={styles.small}>
        {analyzing ? 'Marqueta is checking current work, finding strong matches, and drafting the smallest useful plan…' : ''}
      </div>

      {error && (
        <div id="marketing-work-update-error" role="alert" style={styles.warning}>
          <strong>Marqueta needs another try.</strong>
          <div style={{ marginTop: 3 }}>{error}</div>
        </div>
      )}

      {proposal && normalized && !handoffResult && (
        <section aria-labelledby="marketing-work-update-review-title" style={styles.review}>
          <div>
            <div style={{ ...styles.small, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
              Review before handoff
            </div>
            <h3
              ref={reviewHeadingRef}
              id="marketing-work-update-review-title"
              tabIndex={-1}
              style={{ margin: '4px 0 0', fontSize: 20 }}
            >
              What Marqueta understood
            </h3>
          </div>

          {!usedAi && (
            <div style={styles.warning}>
              <strong>AI is unavailable.</strong> This is a rule-based research scaffold, not a model’s interpretation. Read it carefully before handing it off.
            </div>
          )}

          <div style={styles.callout}>
            <strong style={{ display: 'block' }}>{normalized.title}</strong>
            <div style={{ marginTop: 5, lineHeight: 1.55 }}>{normalized.brief}</div>
            {normalized.audience && (
              <div style={{ ...styles.small, marginTop: 8 }}>
                <strong style={{ color: 'var(--card-fg-color)' }}>Working audience: </strong>{normalized.audience}
              </div>
            )}
          </div>

          {normalized.goals.length > 0 && (
            <div>
              <strong style={{ fontSize: 14 }}>What I’ll figure out</strong>
              <ul style={styles.list}>
                {normalized.goals.slice(0, 4).map((goal) => <li key={goal}>{goal}</li>)}
              </ul>
            </div>
          )}

          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>Assumptions and source matches</summary>
            <div style={{ display: 'grid', gap: 10, marginTop: 9 }}>
              {(proposal.rationale || []).length > 0 && (
                <ul style={styles.list}>
                  {(proposal.rationale || []).slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
              {normalized.researchQuestions.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13 }}>Questions Marqueta will verify</strong>
                  <ul style={styles.list}>
                    {normalized.researchQuestions.slice(0, 4).map((question) => (
                      <li key={question._key}>{question.question}</li>
                    ))}
                  </ul>
                </div>
              )}
              {normalized.collaborators.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13 }}>People and timing captured in the shared brief</strong>
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
                <div style={styles.small}>No confident existing source match was found; Marqueta will start with the internal CMS scan.</div>
              )}
            </div>
          </details>

          <div style={{ border: '1px solid var(--card-border-color)', borderRadius: 9, padding: 12 }}>
            <strong style={{ display: 'block' }}>What the handoff will do</strong>
            <ul style={styles.list}>
              <li>Add one normalized item to Marqueta’s private shared desk.</li>
              <li>Run a free, internal-only GoInvo CMS check and log the result.</li>
              {reuseMatch ? (
                <li>Link the existing <strong>{reuseMatch.project.title || normalized.title}</strong> as a read-only source match ({reuseMatch.reason}); it will not be changed.</li>
              ) : (
                <li>Keep the update in the private queue until a person decides whether a public marketing record is needed.</li>
              )}
            </ul>
          </div>

          <div style={styles.warning}>
            Nothing changes until you hand this off. The reviewed brief is stored privately. Marqueta may organize it and inspect the internal CMS; it never publishes, contacts anyone, approves claims, changes brand voice, deletes records, or spends paid research credits.
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              style={styles.primaryButton}
              disabled={adopting}
              onClick={() => void adoptProposal()}
            >
              {adopting ? 'Handing off…' : 'Hand this to Marketing'}
            </button>
            <button type="button" style={styles.button} disabled={adopting} onClick={reviseUpdate}>
              Revise the update
            </button>
          </div>
        </section>
      )}

      {handoffResult && (
        <section aria-labelledby="marketing-work-update-success-title" style={styles.review}>
          <div style={{ ...styles.callout, borderColor: 'rgba(54, 139, 87, 0.5)', background: 'rgba(54, 139, 87, 0.1)' }}>
            <h3
              ref={successHeadingRef}
              id="marketing-work-update-success-title"
              tabIndex={-1}
              style={{ margin: 0, fontSize: 20 }}
            >
              Marqueta picked it up
            </h3>
            <div style={{ marginTop: 6, lineHeight: 1.55 }}>
              Added <strong>{handoffResult.title}</strong> to Marketing’s private shared desk. Marqueta found {handoffResult.createdResults} internal CMS match{handoffResult.createdResults === 1 ? '' : 'es'} to review. Nothing was published and no public marketing record was changed.
            </div>
            {handoffResult.scanWarning && (
              <div style={{ ...styles.small, marginTop: 7 }}>
                The brief is safe, but the automatic CMS scan needs attention: {handoffResult.scanWarning}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={styles.primaryButton} onClick={() => onOpenOperations(handoffResult)}>
              See Marketing’s desk
            </button>
            {handoffResult.projectId && onOpenResearch && (
              <button type="button" style={styles.button} onClick={() => onOpenResearch(handoffResult)}>
                Open linked research
              </button>
            )}
            <button type="button" style={styles.button} onClick={resetForAnotherUpdate}>
              Tell Marqueta something else
            </button>
          </div>
        </section>
      )}
    </form>
  )
}
