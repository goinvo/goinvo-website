'use client'

import { useEffect } from 'react'

/**
 * Profile tab switching for the Part 1 care-plan diagram (Isabella / Reggie /
 * Donna). The legacy site used Bootstrap tabs (`#tabs` + `a[data-toggle="tab"]`,
 * initialized by `tab.js` + `bootstrap.min.js`); the migration shipped neither,
 * so clicking Reggie/Donna did nothing. This re-implements the Bootstrap tab
 * behavior in vanilla DOM (same approach as CarePlansPopovers / CarePlansCarousels)
 * so we don't have to pull in Bootstrap's JS.
 *
 * (The mobile profile dropdown is already handled by checkboxes.js.)
 */
export function CarePlansTabs() {
  useEffect(() => {
    const diagram = document.querySelector<HTMLElement>(
      '.legacy-careplans .careplan-diagram.desktop',
    )
    if (!diagram) return

    const triggers = Array.from(
      diagram.querySelectorAll<HTMLAnchorElement>(
        '.nav-tabs a[data-toggle="tab"], .nav-tabs a.tab',
      ),
    )
    if (triggers.length === 0) return

    const tabContent = diagram.querySelector<HTMLElement>('.tab-content')

    const onClick = (e: Event) => {
      e.preventDefault()
      const trigger = e.currentTarget as HTMLAnchorElement
      const targetId = (trigger.getAttribute('href') || '').replace(/^#/, '')
      if (!targetId || !tabContent) return

      // Activate the tab (the <li> wrapping the trigger).
      diagram
        .querySelectorAll('.nav-tabs > li')
        .forEach((li) => li.classList.remove('active'))
      trigger.closest('li')?.classList.add('active')

      // Activate the matching pane. ids are numeric ("1"/"2"/"3"), so use an
      // attribute selector — `#1` is not a valid CSS id selector.
      tabContent
        .querySelectorAll(':scope > .tab-pane')
        .forEach((pane) => pane.classList.remove('active'))
      tabContent
        .querySelector(`:scope > [id="${CSS.escape(targetId)}"]`)
        ?.classList.add('active')
    }

    triggers.forEach((t) => {
      t.style.cursor = 'pointer'
      t.addEventListener('click', onClick)
    })

    return () => triggers.forEach((t) => t.removeEventListener('click', onClick))
  }, [])

  return null
}
