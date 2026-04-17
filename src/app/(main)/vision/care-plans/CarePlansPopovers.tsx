'use client'

import { useEffect } from 'react'

/**
 * Activates the Bootstrap-style `[data-toggle="popover"]` triggers in the
 * legacy Care Plans HTML. Each trigger has a `title` (popover header) and a
 * `data-content` (HTML body). Clicking the trigger opens a floating panel
 * positioned above it; clicking outside or on another trigger closes it.
 *
 * The legacy site relied on bootstrap.min.js for this. We don't load
 * Bootstrap, so this component re-implements the click-to-open + click-out
 * behavior with vanilla DOM.
 */
export function CarePlansPopovers() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.legacy-careplans')
    if (!root) return

    const triggers = root.querySelectorAll<HTMLElement>('[data-toggle="popover"]')
    if (triggers.length === 0) return

    let openPanel: HTMLDivElement | null = null
    let openTrigger: HTMLElement | null = null

    function closePanel() {
      if (openPanel) {
        openPanel.remove()
        openPanel = null
        openTrigger = null
      }
    }

    function openFor(trigger: HTMLElement) {
      closePanel()
      const title = trigger.getAttribute('title') || trigger.getAttribute('data-original-title') || ''
      const content = trigger.getAttribute('data-content') || ''
      const placement = trigger.getAttribute('data-placement') || 'top'

      const panel = document.createElement('div')
      panel.className = 'careplans-popover'
      panel.setAttribute('role', 'tooltip')
      panel.innerHTML = `
        ${title ? `<div class="careplans-popover-title">${title}</div>` : ''}
        <div class="careplans-popover-body">${content}</div>
      `
      document.body.appendChild(panel)

      const triggerRect = trigger.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const margin = 8
      let top: number
      let left = triggerRect.left + (triggerRect.width - panelRect.width) / 2

      if (placement === 'bottom') {
        top = triggerRect.bottom + window.scrollY + margin
      } else {
        // default: top
        top = triggerRect.top + window.scrollY - panelRect.height - margin
      }

      // Keep within viewport horizontally
      const maxLeft = window.scrollX + document.documentElement.clientWidth - panelRect.width - 8
      const minLeft = window.scrollX + 8
      left = Math.max(minLeft, Math.min(maxLeft, left + window.scrollX))

      panel.style.top = `${top}px`
      panel.style.left = `${left}px`

      openPanel = panel
      openTrigger = trigger
    }

    function onTriggerClick(this: HTMLElement, e: Event) {
      e.preventDefault()
      e.stopPropagation()
      if (openTrigger === this) {
        closePanel()
      } else {
        openFor(this)
      }
    }

    function onDocClick(e: Event) {
      if (!openPanel) return
      const target = e.target as Node
      if (openPanel.contains(target)) return
      if (openTrigger?.contains(target)) return
      closePanel()
    }

    function onScrollOrResize() {
      closePanel()
    }

    // Make triggers visibly clickable
    triggers.forEach((t) => {
      t.style.cursor = 'help'
      t.addEventListener('click', onTriggerClick as EventListener)
    })

    document.addEventListener('click', onDocClick, true)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      triggers.forEach((t) => t.removeEventListener('click', onTriggerClick as EventListener))
      document.removeEventListener('click', onDocClick, true)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      closePanel()
    }
  }, [])

  return null
}
