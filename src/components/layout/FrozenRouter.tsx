'use client'

import { useContext, useRef } from 'react'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'

/**
 * FrozenRouter prevents children from re-rendering when the route changes.
 * This is essential for AnimatePresence exit animations in Next.js App Router:
 * without it, React immediately swaps children to the new page content,
 * so the "exit" animation would show the NEW page exiting instead of the old.
 *
 * By freezing the LayoutRouterContext, the old page's component tree stays
 * mounted and visible throughout its exit animation.
 */
export function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext)
  const frozen = useRef(context).current

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  )
}
