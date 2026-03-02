Create a new reusable component for the GoInvo website.

## User request

$ARGUMENTS

## Instructions

1. Determine the right location for the component based on its purpose:
   - `src/components/ui/` — generic UI elements (buttons, cards, modals, animations)
   - `src/components/layout/` — layout-level elements (headers, footers, sidebars)
   - `src/components/forms/` — form elements and form sections
   - `src/components/work/` — case study-specific components
   - `src/components/vision/` — vision/feature-specific components
   - `src/components/home/` — homepage-specific sections

2. Follow these conventions:
   - **Named export** (not default): `export function ComponentName()`
   - **PascalCase** filename matching the component name
   - **Server Component** by default — only add `'use client'` if it uses hooks, event handlers, or browser APIs
   - **Tailwind CSS** for all styling — no inline styles or CSS modules
   - **`cn()`** from `@/lib/utils` for conditional class joining
   - **`<Image>`** from `next/image` for all images
   - **Framer Motion** for animations (use `<Reveal>` for scroll-triggered reveals, or `motion.div` for custom animations)
   - **TypeScript** props interface defined inline or in `src/types/index.ts` if shared

3. Design guidelines:
   - `font-serif` for headings, `font-sans` for body text
   - Colors: primary `#E36216` (orange), secondary `#007385` (teal), tertiary `#24434d`
   - Max content width: `max-width` class (1020px)
   - Responsive: design mobile-first, add `md:` and `lg:` breakpoints as needed

4. After creating the component, show the user how to use it (import path + JSX example) and start the dev server if not already running.
