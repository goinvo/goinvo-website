import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '@sanity/icons'

export type GuidedTutorialStep = {
  id: string
  targetId?: string
  instruction: string
  description: ReactNode
  nextLabel?: string
  previousLabel?: string
  onNext?: () => void | Promise<void>
  nextBusy?: boolean
  mirrorTargetAction?: boolean
  allowTargetActionFallback?: boolean
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

type MirroredTargetAction = {
  label: string
  disabled: boolean
  busy: boolean
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
  compact = false,
}: {
  active: boolean
  tutorial: GuidedTutorialDefinition
  stepIndex: number
  onStepChange: (stepIndex: number) => void
  onClose: () => void
  onRestart: () => void
  onShowLibrary: () => void
  onComplete?: () => void
  /** Keep coaching prompts short enough that the highlighted workspace action remains visible. */
  compact?: boolean
}) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [bubbleSize, setBubbleSize] = useState<BubbleSize>({ width: BUBBLE_WIDTH, height: 310 })
  const [mirroredTargetAction, setMirroredTargetAction] = useState<MirroredTargetAction | null>(null)
  const [mirroredActionCoolingDown, setMirroredActionCoolingDown] = useState(false)
  const [ownedTargetId, setOwnedTargetId] = useState<string | undefined>()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const bubbleRef = useRef<HTMLElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const scrolledTargetRef = useRef<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const completed = stepIndex >= tutorial.steps.length
  const currentStep = tutorial.steps[Math.min(stepIndex, Math.max(0, tutorial.steps.length - 1))]
  const currentTargetIdRef = useRef(currentStep?.targetId)
  const mirroredActionLockRef = useRef(false)
  const mirroredActionUnlockTimerRef = useRef<number | null>(null)

  onCloseRef.current = onClose
  currentTargetIdRef.current = currentStep?.targetId

  useEffect(() => {
    if (!active) return undefined
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !bubbleRef.current) return

      const focusable = focusableElements(bubbleRef.current)
      const targetId = currentTargetIdRef.current
      const highlightedTarget = findTourTarget(targetId)
      if (highlightedTarget) {
        const targetFocusables = focusableElements(highlightedTarget)
        if (highlightedTarget.matches(FOCUSABLE_SELECTOR) && isKeyboardFocusable(highlightedTarget)) {
          targetFocusables.unshift(highlightedTarget)
        }
        for (const targetFocusable of targetFocusables) {
          if (!focusable.includes(targetFocusable)) focusable.push(targetFocusable)
        }
      }
      if (focusable.length === 0) {
        event.preventDefault()
        bubbleRef.current.focus({ preventScroll: true })
        return
      }

      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement)
      const nextIndex = nextGuidedTutorialFocusIndex(activeIndex, focusable.length, event.shiftKey)
      event.preventDefault()
      focusable[nextIndex].focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const previouslyFocused = previouslyFocusedRef.current
      previouslyFocusedRef.current = null
      // Modal isolation is restored by a separate effect cleanup. Defer focus
      // until every cleanup has run; focusing an opener while it is still inert
      // is ignored by the browser and strands keyboard users on <body>.
      if (previouslyFocused?.isConnected) {
        queueMicrotask(() => {
          if (previouslyFocused.isConnected) previouslyFocused.focus({ preventScroll: true })
        })
      }
    }
  }, [active, tutorial.id])

  useEffect(() => {
    if (!active || !rootRef.current) return undefined

    const target = !completed ? findTourTarget(currentStep?.targetId) : null
    const assignedTargetId = target && !target.id
      ? `guided-tutorial-target-${safeDomId(currentStep?.targetId || tutorial.id)}`
      : null
    if (target && assignedTargetId) target.id = assignedTargetId
    setOwnedTargetId(target?.id || undefined)

    // A spotlight tutorial has two intentionally reachable islands: its dialog and
    // the highlighted control. Hide/inert every other branch so a screen-reader or
    // keyboard user cannot wander into dimmed controls behind the coach.
    const restoreOutside = isolateDomForModal([rootRef.current, ...(target ? [target] : [])])

    return () => {
      restoreOutside()
      if (target && assignedTargetId && target.id === assignedTargetId) target.removeAttribute('id')
      setOwnedTargetId(undefined)
    }
  }, [active, completed, currentStep?.targetId, tutorial.id])

  useEffect(() => {
    if (!active) return undefined
    const frame = window.requestAnimationFrame(() => bubbleRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [active, completed, currentStep?.id])

  useEffect(() => {
    scrolledTargetRef.current = null
  }, [currentStep?.targetId])

  useEffect(() => {
    mirroredActionLockRef.current = false
    setMirroredActionCoolingDown(false)
    if (mirroredActionUnlockTimerRef.current !== null) {
      window.clearTimeout(mirroredActionUnlockTimerRef.current)
      mirroredActionUnlockTimerRef.current = null
    }
    return () => {
      if (mirroredActionUnlockTimerRef.current !== null) {
        window.clearTimeout(mirroredActionUnlockTimerRef.current)
        mirroredActionUnlockTimerRef.current = null
      }
    }
  }, [active, currentStep?.id])

  useEffect(() => {
    if (!active || completed || !currentStep?.mirrorTargetAction || !currentStep.targetId) {
      setMirroredTargetAction(null)
      return undefined
    }

    const syncTargetAction = () => {
      const target = findTourTarget(currentStep.targetId)
      const actions = target
        ? Array.from(target.querySelectorAll<HTMLElement>('[data-autopilot-next-action="true"]'))
        : []
      if (actions.length !== 1) {
        setMirroredTargetAction(null)
        return
      }
      const action = actions[0]
      const label = (
        action.getAttribute('data-autopilot-next-label')
        || action.getAttribute('aria-label')
        || action.textContent
        || ''
      ).trim()
      const busy = action.getAttribute('aria-busy') === 'true'
      const nextAction = {
        label,
        disabled:
          action.getAttribute('disabled') !== null
          || action.getAttribute('aria-disabled') === 'true'
          || busy,
        busy,
      }
      setMirroredTargetAction((current) =>
        current
        && current.label === nextAction.label
        && current.disabled === nextAction.disabled
        && current.busy === nextAction.busy
          ? current
          : nextAction,
      )
    }

    syncTargetAction()
    const target = findTourTarget(currentStep.targetId)
    const observer = target && typeof MutationObserver !== 'undefined'
      ? new MutationObserver(syncTargetAction)
      : null
    observer?.observe(target!, {
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'aria-busy', 'data-autopilot-next-action', 'data-autopilot-next-label'],
      characterData: true,
      childList: true,
      subtree: true,
    })
    const interval = window.setInterval(syncTargetAction, 500)
    return () => {
      observer?.disconnect()
      window.clearInterval(interval)
    }
  }, [active, completed, currentStep?.id, currentStep?.mirrorTargetAction, currentStep?.targetId])

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

        const element = findTourTarget(currentStep.targetId)
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
      <div ref={rootRef} style={styles.root}>
        <div style={styles.scrim} />
        <section
          ref={bubbleRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          data-tour-id="guided-tutorial-bubble"
          style={{ ...styles.bubble, ...(compact ? styles.compactBubble : {}), ...styles.completeBubble }}
        >
          <button type="button" aria-label="Close tutorial" style={styles.closeButton} onClick={onClose}>
            <CloseIcon style={{ width: 16, height: 16 }} />
          </button>
          <div style={styles.kicker}>Tutorial complete</div>
          <h2 id={titleId} style={styles.title}>{tutorial.title}</h2>
          <p id={descriptionId} style={styles.description}>You can run this again, keep working where you are, or open the tutorial library.</p>
          <div style={styles.completionActions}>
            <button type="button" style={styles.primaryButton} onClick={onClose}>Continue from current position</button>
            <button type="button" style={styles.button} onClick={onRestart}>Run again</button>
            <button type="button" style={styles.button} onClick={onShowLibrary}>See all Autopilot tutorials</button>
          </div>
        </section>
      </div>
    )
  }

  const completedSteps = Math.min(stepIndex + 1, tutorial.steps.length)
  const progress = tutorial.steps.length === 0 ? 0 : (completedSteps / tutorial.steps.length) * 100
  const useTargetActionFallback = Boolean(
    currentStep.mirrorTargetAction
    && currentStep.allowTargetActionFallback
    && (!mirroredTargetAction || (mirroredTargetAction.disabled && !mirroredTargetAction.busy)),
  )
  const useMirroredTargetAction = Boolean(currentStep.mirrorTargetAction && !useTargetActionFallback)
  const nextButtonDisabled = Boolean(
    currentStep.nextBusy
    || mirroredActionCoolingDown
    || (useMirroredTargetAction && (!mirroredTargetAction || mirroredTargetAction.disabled)),
  )
  const nextButtonBusy = Boolean(currentStep.nextBusy || mirroredTargetAction?.busy)

  const goPrevious = () => onStepChange(Math.max(0, stepIndex - 1))
  const goNext = async () => {
    if (nextButtonDisabled) return
    if (useMirroredTargetAction && currentStep.targetId) {
      // The mirrored action can change in place (for example, Review Contacts becomes
      // Add Contacts). Lock before dispatching the underlying click so the second
      // half of a double-click cannot activate the newly rendered destructive step.
      if (mirroredActionLockRef.current) return
      mirroredActionLockRef.current = true
      setMirroredActionCoolingDown(true)
      mirroredActionUnlockTimerRef.current = window.setTimeout(() => {
        mirroredActionLockRef.current = false
        setMirroredActionCoolingDown(false)
        mirroredActionUnlockTimerRef.current = null
      }, 650)
      const target = findTourTarget(currentStep.targetId)
      const actions = target
        ? Array.from(target.querySelectorAll<HTMLElement>('[data-autopilot-next-action="true"]'))
        : []
      if (actions.length !== 1) return
      const action = actions[0]
      if (
        !action.isConnected
        || action.getAttribute('disabled') !== null
        || action.getAttribute('aria-disabled') === 'true'
        || action.getAttribute('aria-busy') === 'true'
      ) return
      action.click()
      return
    }
    if (currentStep.onNext) {
      await currentStep.onNext()
      return
    }
    const nextIndex = stepIndex + 1
    if (nextIndex >= tutorial.steps.length) onComplete?.()
    onStepChange(nextIndex)
  }

  return (
    <div ref={rootRef} style={styles.root}>
      {highlightRect ? (
        <>
          <div aria-hidden="true" style={{ ...styles.blocker, inset: `0 0 auto 0`, height: Math.max(0, highlightRect.top) }} />
          <div aria-hidden="true" style={{ ...styles.blocker, inset: `${highlightRect.top + highlightRect.height}px 0 0 0` }} />
          <div aria-hidden="true" style={{ ...styles.blocker, top: highlightRect.top, left: 0, width: Math.max(0, highlightRect.left), height: highlightRect.height }} />
          <div aria-hidden="true" style={{ ...styles.blocker, top: highlightRect.top, left: highlightRect.left + highlightRect.width, right: 0, height: highlightRect.height }} />
        </>
      ) : (
        <div aria-hidden="true" style={styles.scrim} />
      )}
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
        role="dialog"
        aria-modal="true"
        aria-owns={ownedTargetId}
        tabIndex={-1}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-tour-id="guided-tutorial-bubble"
        style={{
          ...styles.bubble,
          ...(compact ? styles.compactBubble : {}),
          top: bubblePlacement.top,
          left: bubblePlacement.left,
        }}
      >
        <div
          aria-hidden="true"
          style={{ ...styles.arrow, ...arrowStyle(bubblePlacement) }}
        />
        <button type="button" aria-label="Close tutorial" style={styles.closeButton} onClick={onClose}>
          <CloseIcon style={{ width: 16, height: 16 }} />
        </button>
        <div style={styles.kicker}>{tutorial.title}</div>
        <h2 id={titleId} style={styles.title}>{currentStep.instruction}</h2>
        <div id={descriptionId} style={styles.description}>{currentStep.description}</div>
        <div style={styles.progressMeta}>
          <span>{completedSteps} / {tutorial.steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={styles.progressTrack} role="progressbar" aria-label="Tutorial progress" aria-valuemin={0} aria-valuemax={tutorial.steps.length} aria-valuenow={completedSteps}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={styles.navigation}>
          <button type="button" style={styles.iconButton} disabled={stepIndex <= 0} onClick={goPrevious} aria-label={currentStep.previousLabel || 'Previous tutorial step'}>
            <ChevronLeftIcon style={{ width: 18, height: 18 }} />
          </button>
          <button
            type="button"
            style={styles.nextButton}
            disabled={nextButtonDisabled}
            aria-busy={nextButtonBusy || undefined}
            aria-label={
              useMirroredTargetAction && mirroredTargetAction?.label
                ? `${mirroredTargetAction.label} in highlighted panel`
                : undefined
            }
            onClick={() => void goNext()}
          >
            <span aria-live={currentStep.mirrorTargetAction ? 'polite' : undefined}>
              {useMirroredTargetAction && mirroredTargetAction?.label
                ? mirroredTargetAction.label
                : currentStep.nextLabel || (stepIndex >= tutorial.steps.length - 1 ? 'Finish' : 'Next')}
            </span>
            <ChevronRightIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </section>
    </div>
  )
}

export function nextGuidedTutorialFocusIndex(activeIndex: number, focusableCount: number, reverse = false) {
  if (focusableCount <= 0) return -1
  if (activeIndex < 0 || activeIndex >= focusableCount) return reverse ? focusableCount - 1 : 0
  return (activeIndex + (reverse ? -1 : 1) + focusableCount) % focusableCount
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(isKeyboardFocusable)
}

function findTourTarget(targetId?: string | null) {
  if (!targetId) return null
  return Array.from(document.querySelectorAll<HTMLElement>('[data-tour-id]'))
    .find((element) => element.getAttribute('data-tour-id') === targetId) || null
}

function isKeyboardFocusable(element: HTMLElement) {
  if (
    element.hidden
    || element.getAttribute('aria-hidden') === 'true'
    || element.closest('[inert], [aria-hidden="true"]')
  ) return false
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
  const rect = element.getBoundingClientRect()
  if (!isRectVisibleForKeyboard(rect, window.innerWidth, window.innerHeight)) return false

  let visibleLeft = Math.max(0, rect.left)
  let visibleRight = Math.min(window.innerWidth, rect.right)
  let visibleTop = Math.max(0, rect.top)
  let visibleBottom = Math.min(window.innerHeight, rect.bottom)
  let ancestor = element.parentElement
  while (ancestor && ancestor !== document.body) {
    const ancestorStyle = window.getComputedStyle(ancestor)
    const clipsX = /(auto|scroll|hidden|clip)/.test(ancestorStyle.overflowX)
    const clipsY = /(auto|scroll|hidden|clip)/.test(ancestorStyle.overflowY)
    if (clipsX || clipsY) {
      const ancestorRect = ancestor.getBoundingClientRect()
      if (clipsX) {
        visibleLeft = Math.max(visibleLeft, ancestorRect.left)
        visibleRight = Math.min(visibleRight, ancestorRect.right)
      }
      if (clipsY) {
        visibleTop = Math.max(visibleTop, ancestorRect.top)
        visibleBottom = Math.min(visibleBottom, ancestorRect.bottom)
      }
      if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) return false
    }
    ancestor = ancestor.parentElement
  }
  return true
}

export function isRectVisibleForKeyboard(
  rect: Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
) {
  return (
    rect.width > 0
    && rect.height > 0
    && rect.right > 0
    && rect.bottom > 0
    && rect.left < viewportWidth
    && rect.top < viewportHeight
  )
}

type IsolatedElementState = {
  element: HTMLElement
  inert: boolean
  ariaHidden: string | null
}

export function isolateDomForModal(protectedElements: HTMLElement[]) {
  const protectedSet = new Set(protectedElements)
  const protectedAncestors = new Set<HTMLElement>()
  for (const element of protectedElements) {
    let current: HTMLElement | null = element
    while (current) {
      protectedAncestors.add(current)
      if (current === document.body) break
      current = current.parentElement
    }
  }

  const changed: IsolatedElementState[] = []
  for (const ancestor of protectedAncestors) {
    if (protectedSet.has(ancestor)) continue
    for (const child of Array.from(ancestor.children)) {
      if (!(child instanceof HTMLElement)) continue
      if (protectedSet.has(child) || protectedAncestors.has(child)) continue
      if (protectedElements.some((protectedElement) => child.contains(protectedElement))) continue
      changed.push({
        element: child,
        inert: child.inert,
        ariaHidden: child.getAttribute('aria-hidden'),
      })
      child.inert = true
      child.setAttribute('aria-hidden', 'true')
    }
  }

  return () => {
    for (const state of changed.reverse()) {
      state.element.inert = state.inert
      if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden')
      else state.element.setAttribute('aria-hidden', state.ariaHidden)
    }
  }
}

function safeDomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'step'
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
    pointerEvents: 'auto',
  },
  blocker: {
    position: 'fixed',
    background: 'transparent',
    pointerEvents: 'auto',
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
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: 'calc(100dvh - 24px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
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
  compactBubble: {
    maxHeight: 'min(360px, calc(100dvh - 24px))',
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
    position: 'sticky',
    top: 0,
    zIndex: 2,
    float: 'right',
    marginTop: -8,
    marginRight: -8,
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#fff',
    width: 44,
    height: 44,
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
    margin: '0 44px 8px 0',
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
    position: 'sticky',
    bottom: -16,
    zIndex: 2,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    margin: '14px -16px -16px',
    padding: '10px 16px 16px',
    background: '#151a26',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  iconButton: {
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#fff',
    width: 44,
    height: 44,
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
    minHeight: 44,
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
