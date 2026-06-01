import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
  arrowSide: 'top' | 'bottom' | 'left' | 'right'
  arrowLeft?: number
  arrowTop?: number
}

type BubbleSize = {
  width: number
  height: number
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
  const [bubbleSize, setBubbleSize] = useState<BubbleSize>({ width: BUBBLE_WIDTH, height: 310 })
  const bubbleRef = useRef<HTMLElement | null>(null)
  const scrolledTargetRef = useRef<string | null>(null)
  const completed = stepIndex >= tutorial.steps.length
  const currentStep = tutorial.steps[Math.min(stepIndex, Math.max(0, tutorial.steps.length - 1))]

  useEffect(() => {
    scrolledTargetRef.current = null
  }, [currentStep?.targetId])

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
        if (!isRectUsablyVisible(rect) && scrolledTargetRef.current !== currentStep.targetId) {
          element.scrollIntoView({
            block: rect.height > window.innerHeight - EDGE_GAP * 2 ? 'nearest' : 'center',
            inline: 'nearest',
            behavior: 'smooth',
          })
          scrolledTargetRef.current = currentStep.targetId
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

  useEffect(() => {
    if (!active || completed) return undefined
    const element = bubbleRef.current
    if (!element) return undefined

    const updateBubbleSize = () => {
      setBubbleSize({
        width: element.offsetWidth || BUBBLE_WIDTH,
        height: element.offsetHeight || 310,
      })
    }

    updateBubbleSize()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateBubbleSize) : null
    observer?.observe(element)
    window.addEventListener('resize', updateBubbleSize)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateBubbleSize)
    }
  }, [active, completed, currentStep?.id])

  const bubblePlacement = useMemo(() => {
    if (!targetRect) return centeredBubblePlacement(bubbleSize)
    return placeBubble(targetRect, bubbleSize)
  }, [bubbleSize, targetRect])
  const highlightRect = useMemo(() => (targetRect ? visibleHighlightRect(targetRect) : null), [targetRect])

  if (!active) return null

  if (completed) {
    return (
      <div style={styles.root}>
        <div style={styles.scrim} />
        <section data-tour-id="guided-tutorial-bubble" style={{ ...styles.bubble, ...styles.completeBubble }}>
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
      <div style={highlightRect ? styles.clearScrim : styles.scrim} />
      {highlightRect && (
        <div
          aria-hidden="true"
          data-tour-id="guided-tutorial-highlight"
          style={{
            ...styles.highlight,
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}
      <section
        ref={bubbleRef}
        data-tour-id="guided-tutorial-bubble"
        style={{
          ...styles.bubble,
          top: bubblePlacement.top,
          left: bubblePlacement.left,
        }}
        aria-live="polite"
      >
        <div
          aria-hidden="true"
          style={{ ...styles.arrow, ...arrowStyle(bubblePlacement) }}
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

function centeredBubblePlacement(size: BubbleSize): BubblePlacement {
  if (typeof window === 'undefined') return { top: 120, left: 120, arrowSide: 'top', arrowLeft: size.width / 2 }
  return {
    top: clamp(window.innerHeight / 2 - size.height / 2, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - size.height - EDGE_GAP)),
    left: clamp(window.innerWidth / 2 - size.width / 2, EDGE_GAP, Math.max(EDGE_GAP, window.innerWidth - size.width - EDGE_GAP)),
    arrowSide: 'top',
    arrowLeft: size.width / 2,
  }
}

function placeBubble(rect: Rect, size: BubbleSize): BubblePlacement {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const preferredTop = rect.top + rect.height + BUBBLE_GAP
  const maxTop = Math.max(EDGE_GAP, viewportHeight - size.height - EDGE_GAP)
  const shouldPlaceAbove = preferredTop + size.height > viewportHeight - EDGE_GAP && rect.top > size.height + BUBBLE_GAP
  const targetCenter = clamp(rect.left + rect.width / 2, EDGE_GAP, viewportWidth - EDGE_GAP)
  const top = shouldPlaceAbove
    ? clamp(rect.top - size.height - BUBBLE_GAP, EDGE_GAP, maxTop)
    : clamp(preferredTop, EDGE_GAP, maxTop)
  const left = clamp(targetCenter - size.width / 2, EDGE_GAP, Math.max(EDGE_GAP, viewportWidth - size.width - EDGE_GAP))
  const verticalPlacement: BubblePlacement = {
    top,
    left,
    arrowSide: shouldPlaceAbove ? 'bottom' : 'top',
    arrowLeft: clamp(targetCenter - left, 24, size.width - 24),
  }

  if (!rectsIntersect(placementRect(verticalPlacement, size), rect)) return verticalPlacement

  const sidePlacement = placeBubbleBesideTarget(rect, size)
  return sidePlacement || verticalPlacement
}

function visibleHighlightRect(rect: Rect): Rect {
  if (typeof window === 'undefined') {
    return {
      top: rect.top - 8,
      left: rect.left - 8,
      width: rect.width + 16,
      height: rect.height + 16,
    }
  }

  const minSize = 24
  const rawTop = rect.top - 8
  const rawLeft = rect.left - 8
  const rawRight = rect.left + rect.width + 8
  const rawBottom = rect.top + rect.height + 8
  const maxLeft = Math.max(EDGE_GAP, window.innerWidth - EDGE_GAP - minSize)
  const maxTop = Math.max(EDGE_GAP, window.innerHeight - EDGE_GAP - minSize)
  const left = clamp(rawLeft, EDGE_GAP, maxLeft)
  const top = clamp(rawTop, EDGE_GAP, maxTop)
  const right = Math.min(window.innerWidth - EDGE_GAP, Math.max(left + minSize, rawRight))
  const bottom = Math.min(window.innerHeight - EDGE_GAP, Math.max(top + minSize, rawBottom))

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  }
}

function placeBubbleBesideTarget(rect: Rect, size: BubbleSize): BubblePlacement | null {
  if (typeof window === 'undefined') return null
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const targetCenterY = clamp(rect.top + rect.height / 2, EDGE_GAP, viewportHeight - EDGE_GAP)
  const top = clamp(targetCenterY - size.height / 2, EDGE_GAP, Math.max(EDGE_GAP, viewportHeight - size.height - EDGE_GAP))
  const arrowTop = clamp(targetCenterY - top, 24, size.height - 24)
  const spaceLeft = rect.left - EDGE_GAP
  const spaceRight = viewportWidth - (rect.left + rect.width) - EDGE_GAP

  if (spaceLeft >= size.width + BUBBLE_GAP) {
    return {
      top,
      left: clamp(rect.left - size.width - BUBBLE_GAP, EDGE_GAP, Math.max(EDGE_GAP, viewportWidth - size.width - EDGE_GAP)),
      arrowSide: 'right',
      arrowTop,
    }
  }

  if (spaceRight >= size.width + BUBBLE_GAP) {
    return {
      top,
      left: clamp(rect.left + rect.width + BUBBLE_GAP, EDGE_GAP, Math.max(EDGE_GAP, viewportWidth - size.width - EDGE_GAP)),
      arrowSide: 'left',
      arrowTop,
    }
  }

  return null
}

function placementRect(placement: BubblePlacement, size: BubbleSize): Rect {
  return {
    top: placement.top,
    left: placement.left,
    width: size.width,
    height: size.height,
  }
}

function rectsIntersect(first: Rect, second: Rect) {
  return (
    first.left < second.left + second.width &&
    first.left + first.width > second.left &&
    first.top < second.top + second.height &&
    first.top + first.height > second.top
  )
}

function arrowStyle(placement: BubblePlacement): CSSProperties {
  if (placement.arrowSide === 'top') {
    return { left: placement.arrowLeft, top: -8, borderTop: 0, borderBottomColor: '#151a26' }
  }
  if (placement.arrowSide === 'bottom') {
    return { left: placement.arrowLeft, bottom: -8, borderBottom: 0, borderTopColor: '#151a26' }
  }
  if (placement.arrowSide === 'left') {
    return { left: -8, top: placement.arrowTop, borderLeft: 0, borderRightColor: '#151a26' }
  }
  return { right: -8, top: placement.arrowTop, borderRight: 0, borderLeftColor: '#151a26' }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isRectUsablyVisible(rect: DOMRect) {
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const verticalOverlap = Math.min(rect.bottom, viewportHeight - EDGE_GAP) - Math.max(rect.top, EDGE_GAP)
  const horizontalOverlap = Math.min(rect.right, viewportWidth - EDGE_GAP) - Math.max(rect.left, EDGE_GAP)
  const neededHeight = Math.min(rect.height, viewportHeight - EDGE_GAP * 2, 220)
  const neededWidth = Math.min(rect.width, viewportWidth - EDGE_GAP * 2, 220)

  return verticalOverlap >= Math.max(24, neededHeight) && horizontalOverlap >= Math.max(24, neededWidth)
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
  clearScrim: {
    position: 'absolute',
    inset: 0,
    background: 'transparent',
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
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
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
