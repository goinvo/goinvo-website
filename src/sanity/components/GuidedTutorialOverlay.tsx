import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@sanity/icons'

export type GuidedTutorialStep = {
  id: string
  targetId?: string
  instruction: string
  description: ReactNode
  nextLabel?: string
  previousLabel?: string
}

export type GuidedTutorialDefinition = {
  id: string
  title: string
  description: string
  steps: GuidedTutorialStep[]
}

type Rect = {
  top: number
  left: number
  width: number
  height: number
}

type BubblePlacement = {
  top: number
  left: number
  arrowSide: 'top' | 'bottom'
  arrowLeft: number
}

const BUBBLE_WIDTH = 340
const BUBBLE_GAP = 16
const EDGE_GAP = 16

export function GuidedTutorialOverlay({
  active,
  tutorial,
  stepIndex,
  onStepChange,
  onClose,
  onRestart,
  onShowLibrary,
  onComplete,
}: {
  active: boolean
  tutorial: GuidedTutorialDefinition
  stepIndex: number
  onStepChange: (stepIndex: number) => void
  onClose: () => void
  onRestart: () => void
  onShowLibrary: () => void
  onComplete?: () => void
}) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const completed = stepIndex >= tutorial.steps.length
  const currentStep = tutorial.steps[Math.min(stepIndex, Math.max(0, tutorial.steps.length - 1))]

  useEffect(() => {
    if (!active || completed) return undefined
    let frame = 0

    const updateTarget = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (!currentStep?.targetId) {
          setTargetRect(null)
          return
        }

        const element = document.querySelector<HTMLElement>(`[data-tour-id="${currentStep.targetId}"]`)
        if (!element) {
          setTargetRect(null)
          return
        }

        const rect = element.getBoundingClientRect()
        if (!isRectMostlyVisible(rect)) {
          element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
        }
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
      })
    }

    updateTarget()
    window.addEventListener('resize', updateTarget)
    window.addEventListener('scroll', updateTarget, true)
    const interval = window.setInterval(updateTarget, 350)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(interval)
      window.removeEventListener('resize', updateTarget)
      window.removeEventListener('scroll', updateTarget, true)
    }
  }, [active, completed, currentStep?.targetId])

  const bubblePlacement = useMemo(() => {
    if (!targetRect) return centeredBubblePlacement()
    return placeBubble(targetRect)
  }, [targetRect])

  if (!active) return null

  if (completed) {
    return (
      <div style={styles.root}>
        <div style={styles.scrim} />
        <section style={{ ...styles.bubble, ...styles.completeBubble }}>
          <button type="button" aria-label="Close tutorial" style={styles.closeButton} onClick={onClose}>
            <CloseIcon style={{ width: 16, height: 16 }} />
          </button>
          <div style={styles.kicker}>Tutorial complete</div>
          <h2 style={styles.title}>{tutorial.title}</h2>
          <p style={styles.description}>You can run this again, keep working where you are, or open the tutorial library.</p>
          <div style={styles.completionActions}>
            <button type="button" style={styles.primaryButton} onClick={onClose}>Continue from current position</button>
            <button type="button" style={styles.button} onClick={onRestart}>Run again</button>
            <button type="button" style={styles.button} onClick={onShowLibrary}>See all Designer Workflow tutorials</button>
          </div>
        </section>
      </div>
    )
  }

  const completedSteps = Math.min(stepIndex + 1, tutorial.steps.length)
  const progress = tutorial.steps.length === 0 ? 0 : (completedSteps / tutorial.steps.length) * 100

  const goPrevious = () => onStepChange(Math.max(0, stepIndex - 1))
  const goNext = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex >= tutorial.steps.length) onComplete?.()
    onStepChange(nextIndex)
  }

  return (
    <div style={styles.root}>
      <div style={styles.scrim} />
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            ...styles.highlight,
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}
      <section
        style={{
          ...styles.bubble,
          top: bubblePlacement.top,
          left: bubblePlacement.left,
        }}
        aria-live="polite"
      >
        <div
          aria-hidden="true"
          style={{
            ...styles.arrow,
            left: bubblePlacement.arrowLeft,
            ...(bubblePlacement.arrowSide === 'top'
              ? { top: -8, borderTop: 0, borderBottomColor: '#151a26' }
              : { bottom: -8, borderBottom: 0, borderTopColor: '#151a26' }),
          }}
        />
        <button type="button" aria-label="Close tutorial" style={styles.closeButton} onClick={onClose}>
          <CloseIcon style={{ width: 16, height: 16 }} />
        </button>
        <div style={styles.kicker}>{tutorial.title}</div>
        <h2 style={styles.title}>{currentStep.instruction}</h2>
        <div style={styles.description}>{currentStep.description}</div>
        <div style={styles.progressMeta}>
          <span>{completedSteps} / {tutorial.steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={tutorial.steps.length} aria-valuenow={completedSteps}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={styles.navigation}>
          <button type="button" style={styles.iconButton} disabled={stepIndex <= 0} onClick={goPrevious} aria-label={currentStep.previousLabel || 'Previous tutorial step'}>
            <ChevronLeftIcon style={{ width: 18, height: 18 }} />
          </button>
          <button type="button" style={styles.nextButton} onClick={goNext}>
            {currentStep.nextLabel || (stepIndex >= tutorial.steps.length - 1 ? 'Finish' : 'Next')}
            <ChevronRightIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </section>
    </div>
  )
}

function centeredBubblePlacement(): BubblePlacement {
  if (typeof window === 'undefined') return { top: 120, left: 120, arrowSide: 'top', arrowLeft: BUBBLE_WIDTH / 2 }
  return {
    top: Math.max(EDGE_GAP, window.innerHeight / 2 - 180),
    left: clamp(window.innerWidth / 2 - BUBBLE_WIDTH / 2, EDGE_GAP, window.innerWidth - BUBBLE_WIDTH - EDGE_GAP),
    arrowSide: 'top',
    arrowLeft: BUBBLE_WIDTH / 2,
  }
}

function placeBubble(rect: Rect): BubblePlacement {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const estimatedHeight = 310
  const preferredTop = rect.top + rect.height + BUBBLE_GAP
  const shouldPlaceAbove = preferredTop + estimatedHeight > viewportHeight && rect.top > estimatedHeight + BUBBLE_GAP
  const top = shouldPlaceAbove
    ? Math.max(EDGE_GAP, rect.top - estimatedHeight - BUBBLE_GAP)
    : Math.min(Math.max(EDGE_GAP, preferredTop), viewportHeight - estimatedHeight - EDGE_GAP)
  const targetCenter = rect.left + rect.width / 2
  const left = clamp(targetCenter - BUBBLE_WIDTH / 2, EDGE_GAP, viewportWidth - BUBBLE_WIDTH - EDGE_GAP)
  return {
    top,
    left,
    arrowSide: shouldPlaceAbove ? 'bottom' : 'top',
    arrowLeft: clamp(targetCenter - left, 24, BUBBLE_WIDTH - 24),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isRectMostlyVisible(rect: DOMRect) {
  return rect.top >= EDGE_GAP && rect.left >= EDGE_GAP && rect.bottom <= window.innerHeight - EDGE_GAP && rect.right <= window.innerWidth - EDGE_GAP
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.42)',
  },
  highlight: {
    position: 'fixed',
    border: '2px solid #00A6B8',
    borderRadius: 10,
    boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.24), 0 0 0 6px rgba(0, 166, 184, 0.18)',
    transition: 'top 160ms ease, left 160ms ease, width 160ms ease, height 160ms ease',
    pointerEvents: 'none',
  },
  bubble: {
    position: 'fixed',
    width: BUBBLE_WIDTH,
    maxWidth: 'calc(100vw - 32px)',
    border: '1px solid rgba(0, 115, 133, 0.42)',
    borderRadius: 8,
    background: '#151a26',
    color: '#fff',
    boxShadow: '0 22px 56px rgba(0, 0, 0, 0.36)',
    padding: 16,
    pointerEvents: 'auto',
  },
  completeBubble: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid transparent',
    borderBottom: '8px solid transparent',
    transform: 'translateX(-50%)',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#fff',
    width: 30,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  kicker: {
    color: '#00A6B8',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 8,
    paddingRight: 34,
  },
  title: {
    margin: '0 32px 8px 0',
    fontSize: 18,
    lineHeight: 1.25,
  },
  description: {
    margin: '0 0 14px',
    color: 'rgba(255, 255, 255, 0.76)',
    fontSize: 13,
    lineHeight: 1.5,
  },
  progressMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: 12,
    marginBottom: 6,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#00A6B8',
    transition: 'width 180ms ease',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },
  iconButton: {
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#fff',
    width: 38,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  nextButton: {
    border: '1px solid #007385',
    borderRadius: 6,
    background: '#007385',
    color: '#fff',
    minHeight: 36,
    padding: '0 12px',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  button: {
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#fff',
    padding: '9px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  primaryButton: {
    border: '1px solid #007385',
    borderRadius: 6,
    background: '#007385',
    color: '#fff',
    padding: '9px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  completionActions: {
    display: 'grid',
    gap: 8,
  },
}
