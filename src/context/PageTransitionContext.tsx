'use client'

import { createContext, useContext, useState, useCallback } from 'react'

export interface CardRect {
  top: number
  left: number
  width: number
  height: number
  image: string
  href: string
}

export interface MorphRect {
  top: number
  left: number
  width: number
  height: number
}

export interface SectionMorph {
  bgRect: MorphRect
  bgImage: string
  bgPosition: string
  cardRect: MorphRect
  href: string
  targetBgRect: MorphRect
  targetCardRect: MorphRect
}

interface PageTransitionValue {
  cardRect: CardRect | null
  triggerCardTransition: (rect: CardRect) => void
  sectionMorph: SectionMorph | null
  triggerSectionMorph: (morph: SectionMorph) => void
  clearTransition: () => void
}

const PageTransitionContext = createContext<PageTransitionValue | null>(null)

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [cardRect, setCardRect] = useState<CardRect | null>(null)
  const [sectionMorph, setSectionMorph] = useState<SectionMorph | null>(null)

  const triggerCardTransition = useCallback((rect: CardRect) => {
    setCardRect(rect)
  }, [])

  const triggerSectionMorph = useCallback((morph: SectionMorph) => {
    setSectionMorph(morph)
  }, [])

  const clearTransition = useCallback(() => {
    setCardRect(null)
    setSectionMorph(null)
  }, [])

  return (
    <PageTransitionContext.Provider
      value={{ cardRect, triggerCardTransition, sectionMorph, triggerSectionMorph, clearTransition }}
    >
      {children}
    </PageTransitionContext.Provider>
  )
}

export function usePageTransition() {
  return useContext(PageTransitionContext)
}
