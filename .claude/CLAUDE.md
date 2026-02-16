# GoInvo Website - Next.js Migration

## Tech Stack
- **Framework**: Next.js 16+ (App Router) with React Server Components
- **CMS**: Sanity (embedded studio at /studio)
- **Styling**: Tailwind CSS v4 (CSS-based config via `@theme` in globals.css)
- **Animations**: Framer Motion
- **Fonts**: Adobe Jenson Pro (serif headings) + Open Sans (sans body) via TypeKit

## Design System
- Colors defined in `src/app/globals.css` under `@theme`
- Primary: `#E36216` (orange), Secondary: `#007385` (teal), Tertiary: `#24434d`
- Use `font-serif` for headings, `font-sans` for body text
- Breakpoints: sm=568px, md=768px, lg=864px, xl=1280px
- Max content width: 1020px (use `max-width` utility class)

## Component Guidelines
- Server Components by default; add `"use client"` only when needed (interactivity, hooks, browser APIs)
- Use `@/` import alias (maps to `./src/`)
- Use `cn()` from `@/lib/utils` for conditional class joining
- Use `<Image>` from `next/image` for all images
- Use Sanity image URL builder for CMS images
- Use `cloudfrontImage()` from `@/lib/utils` for legacy CDN images

## File Structure
- `src/app/` - Pages (App Router)
- `src/components/` - Reusable components (layout/, ui/, work/, forms/, etc.)
- `src/lib/` - Utilities and config
- `src/types/` - TypeScript types
- `src/sanity/` - Sanity schemas, client, queries

## Conventions
- Tailwind classes for all styling (no SCSS)
- Framer Motion for animations (fade-in, slide-up, hover effects)
- Named exports for components
- PascalCase component files, camelCase utility files

## Transition & Animation Framework

This site uses a persistent layout (`TransitionLayout`) with `AnimatePresence` and a `FrozenRouter` to orchestrate animated transitions between pages. The header and footer remain mounted across navigations — only the content area swaps with enter/exit animations.

### Architecture

- **`src/components/layout/TransitionLayout.tsx`**: Client wrapper around `<main>` in `layout.tsx`. Contains `AnimatePresence mode="wait"` keyed on `pathname`, wrapping a `motion.div` with enter/exit variants. Also renders `CardTransitionOverlay`.
- **`src/components/layout/FrozenRouter.tsx`**: Freezes `LayoutRouterContext` so old page content stays mounted and visible throughout exit animations (prevents React from swapping to new page content immediately).
- **`src/context/PageTransitionContext.tsx`**: Holds `CardRect` state for card-to-page morphing transitions. Provides `triggerCardTransition()` and `clearTransition()`.
- **`src/components/layout/CardTransitionOverlay.tsx`**: Fixed overlay that morphs a card image from its position to fullscreen hero (60vh). Uses `AnimatePresence` internally.

### Page Transition Flow

```
Page navigation occurs
  → AnimatePresence exit: old page fades out (opacity, scale, blur)
  → FrozenRouter keeps old content visible during exit
  → AnimatePresence enter: new page fades in (opacity, scale, blur)
  → Duration: 0.35s, ease: [0.4, 0, 0.2, 1]
```

### Card-Click Morph Flow (Work Page)

```
User clicks case study card
  → CaseStudyCard captures getBoundingClientRect + image URL
  → triggerCardTransition(rect) stores in context
  → CardTransitionOverlay renders:
    - Background scrim (blur + dark overlay)
    - Image morphs from card position → { top: 0, left: 0, width: 100vw, height: 60vh }
  → After 550ms: router.push(href, { scroll: false })
  → After 950ms: clearTransition() removes overlay
  → New page enters via AnimatePresence
```

### Homepage Section Morph Flow (Planned)

When clicking a case study on the homepage:
1. Elements sharing the same background color with the destination page morph (position/size change to match destination)
2. All other content collapses vertically
3. Text on morphing elements crossfades in/out

### Critical Rules

1. **NEVER remove `FrozenRouter` from `TransitionLayout`.** Without it, exit animations show the NEW page content instead of the old.
2. **Always pass `{ scroll: false }` when navigating programmatically** during transition animations. The transition system manages timing.
3. **Card morph clicks must call `e.preventDefault()`** on the link to prevent immediate navigation. The overlay handles navigation after the morph completes.
4. **`template.tsx` is deleted intentionally.** The `TransitionLayout` with `AnimatePresence` handles all page transitions. Do not recreate `template.tsx`.

### Animation Conventions

- **Easing**: `[0.4, 0, 0.2, 1]` (material design standard) for layout transitions
- **Page enter/exit**: 0.35s with scale (1.015→1→0.985), y offset (16→0→-12), blur (3px→0→3px)
- **Scroll reveals**: `<Reveal>` component with 6 styles (slide-up, slide-left, slide-right, scale, clip-up, clip-left)
- **Section entrance**: `useInView` with `margin: '-60px'`, `once: true`, duration 0.6s
- **Card morph overlay**: 0.55s with ease `[0.32, 0.72, 0, 1]`
- **View Transitions API**: Enabled in `next.config.ts` (`experimental: { viewTransition: true }`). CSS rules in `globals.css` with `view-transition-name` on header, hero images, and page titles.

### View Transition Names

- `header` — persistent header (no animation)
- `hero-image` — hero sections on work, about, services, case study pages
- `page-title` — h1 headings on homepage and subpages

### Section Visibility (Future State Machine)

When the homepage section morph is implemented:
- `idle` — all sections visible at rest
- `collapsing` — card clicked, non-target sections collapse, target section morphs
- `open` — navigated to case study, overlay visible
- `closing` — returning to homepage, sections expand back
