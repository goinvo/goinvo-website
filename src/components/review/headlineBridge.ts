'use client'

import { useSyncExternalStore } from 'react'
import type { Subline, Tagline } from '@/components/home-story/taglines'

/**
 * How the homepage study hands its headline choice to the one review panel
 * (ReviewSwitches, mounted by the root layout). The page publishes what it shows and how
 * to change it; the panel, which lives outside the page, draws the controls. No page
 * mounted: nothing published, and the panel shows no headline section.
 */
export interface HeadlineControl {
  tagline: Tagline
  subline: Subline
  /** A null subline goes back to the one the headline was written over. */
  choose: (headline: string, subline: string | null) => void
}

let current: HeadlineControl | null = null
const listeners = new Set<() => void>()

export function publishHeadlineControl(control: HeadlineControl | null) {
  current = control
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function useHeadlineControl(): HeadlineControl | null {
  return useSyncExternalStore(subscribe, () => current, () => null)
}
