'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import { usePathname } from 'next/navigation'

/* ------------------------------------------------------------------ */
/*  Hero config per route                                              */
/* ------------------------------------------------------------------ */

export interface HeroConfig {
  image: string
  bgPosition: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  hideTextBox?: boolean
  /** After slide-in, expand the image container to reveal the full image */
  expandAfterSlide?: boolean
  /** Side-by-side images on desktop (overrides single image when present) */
  desktopImages?: string[]
  /** Stacked images on mobile (falls back to desktopImages or single image) */
  mobileImages?: string[]
}

export const heroConfigs: Record<string, HeroConfig> = {
  '/work': {
    image: '/images/work/dr-emily.jpg',
    bgPosition: 'center top',
    title: (
      <>
        Design that Delivers<span className="text-primary font-serif">.</span>
      </>
    ),
    subtitle: 'Real projects, real users, real business outcomes.',
  },
  '/services': {
    image: '/images/services/hand-drawing.jpg',
    bgPosition: 'center top',
    title: (
      <>
        Disrupt from within,<br />
        Reinvent your product,<br />
        Change the market<span className="text-primary font-serif">.</span>
      </>
    ),
  },
  '/about': {
    image: '/images/about/care-cards-hand.jpg',
    bgPosition: 'center',
    title: (
      <>
        Our shared purpose:<br />
        better systems +<br />
        better lives thru <span className="whitespace-nowrap">design<span className="text-primary font-serif">.</span></span>
      </>
    ),
  },
  '/vision': {
    image: '/images/vision/vision-illustration-desktop-left.jpg',
    bgPosition: 'center',
    title: null,
    hideTextBox: true,
    expandAfterSlide: true,
    desktopImages: [
      '/images/vision/vision-illustration-desktop-left.jpg',
      '/images/vision/vision-illustration-desktop-right.jpg',
    ],
    mobileImages: [
      '/images/vision/vision-illustration-mobile-home.jpg',
      '/images/vision/vision-illustration-mobile-practice.jpg',
      '/images/vision/vision-illustration-mobile-country.jpg',
    ],
  },
  '/open-source-health-design': {
    image: '/images/open_source/open-source-bgd.png',
    bgPosition: 'center',
    title: (
      <>
        Open Source Health Design<span className="text-primary font-serif">.</span>
      </>
    ),
    subtitle: 'Bringing Trust, Openness, Innovation, & Design to Healthcare',
  },
}

/* ------------------------------------------------------------------ */
/*  Route ordering — used to derive slide direction                    */
/* ------------------------------------------------------------------ */

const routeOrder = [
  '/',
  '/work',
  '/services',
  '/about',
  '/vision',
  '/ai',
  '/enterprise',
  '/government',
  '/patient-engagement',
  '/open-source-health-design',
  '/why-hire-healthcare-design-studio',
  '/contact',
]

function routeDirection(from: string | null, to: string): number {
  if (!from) return 1
  const a = routeOrder.indexOf(from)
  const b = routeOrder.indexOf(to)
  if (a === -1 || b === -1) return 1
  return b > a ? 1 : b < a ? -1 : 1
}

/* ------------------------------------------------------------------ */
/*  State machine                                                      */
/* ------------------------------------------------------------------ */

type HeroPhase = 'idle' | 'sliding' | 'hidden'

interface HeroState {
  phase: HeroPhase
  pathname: string
  config: HeroConfig | null
  displayImage: string | null
  bgPosition: string
  direction: number
  imageKey: number
  /** Pending case study hero set before navigation (card click flow) */
  caseStudyHero: { image: string; bgPosition: string } | null
}

type HeroAction =
  | { type: 'NAVIGATE'; pathname: string; prevPathname: string | null }
  | { type: 'OVERRIDE'; image: string; bgPosition?: string; direction?: number }
  | { type: 'SLIDE_DONE' }
  | { type: 'SET_CASE_STUDY_HERO'; image: string; bgPosition?: string }

function isDynamicHeroRoute(pathname: string): boolean {
  return (pathname.startsWith('/work/') && pathname.length > 6) ||
    (pathname.startsWith('/vision/') && pathname.length > 8 && pathname !== '/vision/experiments')
}

function heroReducer(state: HeroState, action: HeroAction): HeroState {
  switch (action.type) {
    case 'NAVIGATE': {
      const config = heroConfigs[action.pathname] ?? null

      // Case study route — /work/[slug]
      if (!config && isDynamicHeroRoute(action.pathname)) {
        if (state.caseStudyHero) {
          // Card-click flow: hero image was pre-set before navigation
          const csConfig: HeroConfig = {
            image: state.caseStudyHero.image,
            bgPosition: state.caseStudyHero.bgPosition,
            title: null,
            hideTextBox: true,
          }
          return {
            ...state,
            phase: 'idle',
            pathname: action.pathname,
            config: csConfig,
            displayImage: state.caseStudyHero.image,
            bgPosition: state.caseStudyHero.bgPosition,
            caseStudyHero: null,
          }
        }
        // Direct URL access — stay hidden until page component sets hero
        return {
          ...state,
          phase: 'hidden',
          pathname: action.pathname,
          config: null,
          displayImage: null,
          caseStudyHero: null,
        }
      }

      if (!config) {
        return {
          ...state,
          phase: 'hidden',
          pathname: action.pathname,
          config: null,
          displayImage: null,
          caseStudyHero: null,
        }
      }
      const direction = routeDirection(action.prevPathname, action.pathname)
      return {
        phase: 'sliding',
        pathname: action.pathname,
        config,
        displayImage: config.image,
        bgPosition: config.bgPosition,
        direction,
        imageKey: state.imageKey + 1,
        caseStudyHero: null,
      }
    }

    case 'SET_CASE_STUDY_HERO': {
      const image = action.image
      const bgPosition = action.bgPosition ?? 'center top'

      // Direct access: already on a case study route but hero is hidden
      if (state.phase === 'hidden' && isDynamicHeroRoute(state.pathname)) {
        const csConfig: HeroConfig = {
          image,
          bgPosition,
          title: null,
          hideTextBox: true,
        }
        return {
          ...state,
          phase: 'idle',
          config: csConfig,
          displayImage: image,
          bgPosition,
          caseStudyHero: { image, bgPosition },
          imageKey: state.imageKey + 1,
        }
      }

      // Card-click: store for when NAVIGATE fires after router.push
      return {
        ...state,
        caseStudyHero: { image, bgPosition },
      }
    }

    case 'OVERRIDE': {
      if (!state.config) return state // ignore overrides when no hero
      return {
        ...state,
        phase: 'sliding',
        displayImage: action.image,
        bgPosition: action.bgPosition ?? state.bgPosition,
        direction: action.direction ?? 1,
        imageKey: state.imageKey + 1,
      }
    }

    case 'SLIDE_DONE': {
      return { ...state, phase: 'idle' }
    }

    default:
      return state
  }
}

function initialState(pathname: string): HeroState {
  const config = heroConfigs[pathname] ?? null
  return {
    phase: config ? 'idle' : 'hidden',
    pathname,
    config,
    displayImage: config?.image ?? null,
    bgPosition: config?.bgPosition ?? 'center',
    direction: 1,
    imageKey: 0,
    caseStudyHero: null,
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface HeroContextValue {
  state: HeroState
  overrideImage: (image: string, bgPosition?: string, direction?: number) => void
  slideDone: () => void
  setCaseStudyHero: (image: string, bgPosition?: string) => void
}

const HeroCtx = createContext<HeroContextValue | null>(null)

export function HeroProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPathname = useRef<string | null>(null)

  const [state, dispatch] = useReducer(
    heroReducer,
    pathname,
    initialState,
  )

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      dispatch({
        type: 'NAVIGATE',
        pathname,
        prevPathname: prevPathname.current,
      })
      prevPathname.current = pathname
    }
  }, [pathname])

  const overrideImage = useCallback(
    (image: string, bgPosition?: string, direction?: number) => {
      dispatch({ type: 'OVERRIDE', image, bgPosition, direction })
    },
    [],
  )

  const slideDone = useCallback(() => {
    dispatch({ type: 'SLIDE_DONE' })
  }, [])

  const setCaseStudyHero = useCallback(
    (image: string, bgPosition?: string) => {
      dispatch({ type: 'SET_CASE_STUDY_HERO', image, bgPosition })
    },
    [],
  )

  return (
    <HeroCtx.Provider value={{ state, overrideImage, slideDone, setCaseStudyHero }}>
      {children}
    </HeroCtx.Provider>
  )
}

export function useHero() {
  const ctx = useContext(HeroCtx)
  if (!ctx) throw new Error('useHero must be used within HeroProvider')
  return ctx
}
