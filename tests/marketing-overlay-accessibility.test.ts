import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import {
  GuidedTutorialOverlay,
  isRectVisibleForKeyboard,
} from '@/sanity/components/GuidedTutorialOverlay'
import {
  nextMarketingMenuItemIndex,
} from '@/sanity/tools/marketingTool'
import { defaultDesignerWorkflowTutorial } from '@/sanity/tutorials/designerWorkflowTutorials'

describe('Marketing overlay keyboard and assistive-technology behavior', () => {
  it('renders the tutorial as a modal, labelled dialog', () => {
    const html = renderToStaticMarkup(
      createElement(GuidedTutorialOverlay, {
        active: true,
        tutorial: defaultDesignerWorkflowTutorial,
        stepIndex: 0,
        onStepChange: vi.fn(),
        onClose: vi.fn(),
        onRestart: vi.fn(),
        onShowLibrary: vi.fn(),
      }),
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby=')
    expect(html).toContain('aria-describedby=')
  })

  it('does not admit zero-sized or off-screen tutorial targets into the Tab sequence', () => {
    expect(isRectVisibleForKeyboard(
      { top: 10, right: 110, bottom: 50, left: 10, width: 100, height: 40 },
      320,
      240,
    )).toBe(true)
    expect(isRectVisibleForKeyboard(
      { top: 10, right: 10, bottom: 10, left: 10, width: 0, height: 0 },
      320,
      240,
    )).toBe(false)
    expect(isRectVisibleForKeyboard(
      { top: 260, right: 110, bottom: 300, left: 10, width: 100, height: 40 },
      320,
      240,
    )).toBe(false)
    expect(isRectVisibleForKeyboard(
      { top: 10, right: -10, bottom: 50, left: -110, width: 100, height: 40 },
      320,
      240,
    )).toBe(false)
  })

  it('wraps the More menu with Arrow keys and honors Home and End', () => {
    expect(nextMarketingMenuItemIndex(-1, 3, 'ArrowDown')).toBe(0)
    expect(nextMarketingMenuItemIndex(-1, 3, 'ArrowUp')).toBe(2)
    expect(nextMarketingMenuItemIndex(2, 3, 'ArrowDown')).toBe(0)
    expect(nextMarketingMenuItemIndex(0, 3, 'ArrowUp')).toBe(2)
    expect(nextMarketingMenuItemIndex(1, 3, 'Home')).toBe(0)
    expect(nextMarketingMenuItemIndex(1, 3, 'End')).toBe(2)
    expect(nextMarketingMenuItemIndex(0, 0, 'ArrowDown')).toBe(-1)
  })

  it('isolates the tutorial while retaining its highlighted target as an owned AT island', () => {
    const source = readFileSync('src/sanity/components/GuidedTutorialOverlay.tsx', 'utf8')

    expect(source).toContain('aria-owns={ownedTargetId}')
    expect(source).toContain('isolateDomForModal([rootRef.current, ...(target ? [target] : [])])')
    expect(source).toContain('child.inert = true')
    expect(source).toContain("child.setAttribute('aria-hidden', 'true')")
    expect(source).toContain('state.element.inert = state.inert')
  })

  it('gives the More menu full disclosure, dismissal, and roving-focus wiring', () => {
    const source = readFileSync('src/sanity/tools/marketingTool.tsx', 'utf8')

    expect(source).toContain('aria-haspopup="menu"')
    expect(source).toContain('aria-controls="marketing-more-actions-menu"')
    expect(source).toContain('aria-labelledby="marketing-more-actions-trigger"')
    expect(source).toContain("document.addEventListener('pointerdown', handlePointerDown, true)")
    expect(source).toContain("document.addEventListener('keydown', handleEscape)")
    expect(source).toContain("['ArrowDown', 'ArrowUp', 'Home', 'End']")
    expect(source).toContain('actionsTriggerRef.current?.focus({ preventScroll: true })')
  })

  it('makes compact Autopilot a labelled, scroll-contained focus-managed dialog', () => {
    const source = readFileSync('src/sanity/tools/marketingTool.tsx', 'utf8')

    expect(source).toContain('id="marketing-autopilot-dialog"')
    expect(source).toContain("role={coachOnly ? undefined : 'dialog'}")
    expect(source).toContain("aria-modal={!coachOnly && compactLayout ? 'true' : undefined}")
    expect(source).toContain('aria-labelledby={coachOnly ? undefined : guidePanelTitleId}')
    expect(source).toContain('aria-haspopup="dialog"')
    expect(source).toContain('aria-controls="marketing-autopilot-dialog"')
    expect(source).toContain("document.body.style.overflow = 'hidden'")
    expect(source).toContain('const restoreModalIsolation = isolateDomForModal([guidePanelRef.current])')
    expect(source).toContain("overscrollBehavior: 'contain'")
    expect(source).toContain("if (event.key === 'Escape')")
    expect(source).toContain('guideOpenerRef.current')
    expect(source).toContain('opener.focus({ preventScroll: true })')
  })

  it('returns focus after closing each Outreach panel that moved focus on reveal', () => {
    const source = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(source).toContain('revealedPanelOpenersRef')
    expect(source).toContain("rememberRevealedPanelOpener('log', logPanelRef)")
    expect(source).toContain("rememberRevealedPanelOpener('channelOptions', channelOptionsEditorRef)")
    expect(source).toContain("rememberRevealedPanelOpener('trackerDetail', trackerDetailRef)")
    expect(source).toContain("restoreRevealedPanelOpener('log')")
    expect(source).toContain("restoreRevealedPanelOpener('channelOptions')")
    expect(source).toContain("restoreRevealedPanelOpener('trackerDetail')")
    expect(source).toContain("if (opener?.isConnected) opener.focus({ preventScroll: true })")
  })
})
