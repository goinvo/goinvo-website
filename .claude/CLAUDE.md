# GoInvo Website - Next.js Migration

## Current Task (2026-03-29): Vision Page Static Override Removal

**Goal**: Delete all static vision page overrides so pages are served by the Sanity-driven `[slug]` route.

### Batch 1 — Deleted (27 pages, pending commit)
These 27 static overrides have been deleted in the working tree but NOT yet committed:
augmented-clinical-decision-support, coronavirus, digital-health-trends-2022, eligibility-engine,
faces-in-health-communication, fraud-waste-abuse-in-healthcare, health-design-thinking, healthcare-ai,
healthcare-dollars, history-of-health-design, human-centered-design-for-ai, living-health-lab,
loneliness-in-our-human-code, national-cancer-navigation, open-pro, open-source-healthcare,
own-your-health-data, patient-centered-consent, physician-burnout, precision-autism,
public-healthroom, test-treat-trace, vapepocolypse, virtual-care, virtual-diabetes-care,
visual-storytelling-with-genai, who-uses-my-health-data

**Restored to static overrides (need Sanity content migration first):**
- `us-healthcare-problems` — 50 numbered headings missing from Sanity, interactive infographic
- `primary-self-care-algorithms` — 10+ expand/collapse interactive buttons not in Sanity
- `augmented-clinical-decision-support` — 21-slide SlickCarousel pregnancy storyboard
- `public-healthroom` — scroll-driven sticky prototype with react-scrollspy
- `loneliness-in-our-human-code` — 29 SVG icon imports in custom grid/timeline layouts

**Status**: Audit complete. 0 critical, 9/27 clean. Remaining issues are Sanity content gaps (missing images in interactive sections, mid-span superscripts, missing headings) that need manual editing in Sanity Studio.

### Audit Results (2026-03-29)

**CRITICAL — RESOLVED (stale .next cache)**
- 4 pages (national-cancer-navigation, open-pro, public-healthroom, virtual-care) appeared to have missing references. Fixed by `rm -rf .next && npx next build`.

**Clean audit after clean build (7/29 pages pass):**
digital-health-trends-2022, faces-in-health-communication, open-source-healthcare, test-treat-trace, vapepocolypse, virtual-diabetes-care, who-uses-my-health-data

**Pages that should KEEP static overrides (need content migration to Sanity first):**
- `us-healthcare-problems` — 50 numbered headings are NOT in Sanity (only 26 blocks total). Interactive infographic. Needs massive content migration.
- `primary-self-care-algorithms` — 10+ expand/collapse interactive buttons not in Sanity. Needs custom block type or content migration.

**Remaining HIGH issues (Sanity content gaps, not code bugs):**
- Missing images: augmented-clinical-decision-support (-45), public-healthroom (-36), loneliness (-33), living-health-lab (-32), national-cancer (-9), visual-storytelling (-8), open-pro (-6)
- Missing superscripts: living-health-lab (-30), primary-self-care (-21), coronavirus (-16), open-pro (-7), virtual-care (-3), patient-centered-consent (-3), public-healthroom (-3)
- Missing quotes: human-centered-design-for-ai (-6), fraud-waste-abuse (-4), health-design-thinking (-2), eligibility-engine (-2), open-pro (-1)
- Missing iframes: 6 pages (these are embedded videos/prototypes in Gatsby, likely missing `iframeEmbed` blocks in Sanity)
- Missing headings: fraud-waste-abuse (title stripped by overlap matcher), coronavirus (concatenated title), public-healthroom (title stripped), human-centered-design-for-ai (1 heading)
- Missing anchors: fraud-waste-abuse (#methodology), healthcare-dollars (#methodology), living-health-lab (#appendix), virtual-care (#methodology)
- Missing videos: healthcare-ai (-2 but has +2 iframes, likely converted), visual-storytelling (-1)

**Issues that are FALSE POSITIVES or acceptable:**
- healthcare-ai: 2 videos vs 2 iframes — videos were converted to iframe embeds, equivalent
- SRC_MISSING_HEADING for titles that got stripped by `stripTitleHeading` (expected behavior)

### Batch 2 — Still have static overrides (future work)
ai-design-certification, bathroom-to-healthroom, care-plans, determinants-of-health,
digital-healthcare, disrupt, ebola-care-guideline, experiments, healing-us-healthcare,
health-visualizations, killer-truths, oral-history-goinvo, print-big, redesign-democracy,
understanding-ebola, understanding-zika

### Supporting changes in this batch
- `PortableTextRenderer.tsx` — extended with new block types/variants
- `compare-pages.ts` — enhanced audit script
- `globals.css` — new utility classes (header-lg, header-xl)
- `Quote.tsx`, `utils.ts`, `portableText.ts` — supporting improvements

### Process for each page
1. Run `npx tsx scripts/compare-pages.ts <slug> --verbose`
2. Fix any CRITICAL/HIGH issues (heading mismatches, missing elements, style problems)
3. Re-run audit to confirm fixes
4. Delete static override & commit

---

## Known Gotchas

### ALWAYS clean build before auditing or debugging rendering
Run `rm -rf .next` before `npx next build`. The `.next` cache can serve stale SSG pages even after code changes. If content appears missing (e.g., PortableText custom blocks like `references` not rendering), 99% chance it's stale cache. Never waste time debugging rendering without cleaning first.
```bash
rm -rf .next && npx next build
```

### ALWAYS kill previous node servers before starting new ones
On Windows, `npx next start` or `npx next dev` won't error if port 3000 is already in use — it silently serves the old instance. Kill all node processes first:
```bash
taskkill //f //im node.exe 2>/dev/null
```

### Audit script only accepts one slug argument
`compare-pages.ts` uses `args.find()` — only the first positional slug is processed. Loop for multiple:
```bash
for slug in page1 page2 page3; do npx tsx scripts/compare-pages.ts $slug --verbose; done
```

### Sanity returns empty data silently when env vars are missing
`.env.local` must exist with valid tokens. If `NEXT_PUBLIC_SANITY_PROJECT_ID` is missing, `sanityFetch` returns empty arrays with no error — pages will render blank with no warning. Check `.env.local` if pages are completely empty.

---

## Gatsby Source Code
- **Path**: `C:\Users\quest\Programming\GoInvo\goinvo.com`
- Always check the Gatsby source when investigating visual parity issues
- Page sources in `src/pages/vision/<slug>/index.js`
- Styles in `src/styles/` (SCSS, component-scoped files like `_columns.scss`, `_images.scss`)

## Environment Variables
- Sanity write token: `SANITY_WRITE_TOKEN` (NOT `SANITY_API_WRITE_TOKEN`)
- Sanity read token: `SANITY_API_READ_TOKEN`
- All env vars are in `.env.local`

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

## Sanity-First Content Strategy

**All page content MUST live in Sanity whenever possible.** Do NOT create static page.tsx files with hardcoded content. The CMS is the source of truth.

### Rules
1. **Use the dynamic `[slug]` route** — Vision pages use `/vision/[slug]/page.tsx`, case studies use `/work/[slug]/page.tsx`. Content is authored in Sanity and rendered via `PortableTextRenderer`.
2. **Never hardcode article content in .tsx files.** If a page is just headings, text, images, lists, quotes, references, and author bios, it belongs in Sanity — no static override needed.
3. **When you need a new visual element**, add a variant or parameter to an existing Sanity block type, or create a new block type + PortableText component. **Do NOT create a static page override to work around renderer limitations.** Fix the renderer instead.
4. **Only create a static page override** when the page requires truly unique interactive components (3D viewers, D3 charts, complex stateful UIs) that can't be represented as a block type. Even then, keep the prose content in Sanity and only use the static file to mount the interactive component alongside Sanity content.
5. **References belong in Sanity** as `references` blocks inside the document content, not in separate JSON files.
6. **Authors belong in Sanity** as referenced `teamMember` documents, not hardcoded in page files.

### Migrating a Page to Sanity (Required Process)

When removing a static page override to let the Sanity `[slug]` route take over, you MUST verify visual parity with the live Gatsby site (goinvo.com). **Do not just delete the override and assume it works.**

1. **Visual comparison first** — Run `npx tsx scripts/compare-visual.ts <slug> --screenshots --verbose` to compare computed styles (fonts, spacing, colors, image sizes, list bullets, superscripts) between Gatsby and Next.js using Puppeteer. Screenshots are saved to `.audit/screenshots/` for manual review.
2. **Fix Sanity content** — If content is wrong (wrong heading level, missing superscripts, incorrect image size attribute, missing text), fix it in Sanity directly. The Sanity data must be correct.
3. **Add renderer variants when the renderer can't produce the right output** — If images render too large, add a `size` parameter. If headings need different styling, add a style variant. If lists need star bullets, ensure `.ul` class is used. **Always extend the renderer rather than hardcoding page-specific markup.**
4. **Structural audit** — Run `npx tsx scripts/compare-pages.ts <slug> --verbose` for heading/element count checks.
5. **Only then delete the override** — After confirming the Sanity version visually matches the original.

### Adding New Block Types / Variants
When content needs a visual treatment the renderer doesn't support yet:
1. **Prefer extending existing block types** — e.g., add `size` field to images, `color` to backgrounds, `variant` to headings. Don't create new types when a parameter on an existing type works.
2. Add the schema field to `src/sanity/schemas/` (or extend the `portableTextContent` definition)
3. Add the renderer handling to `src/components/portable-text/PortableTextRenderer.tsx`
4. The variant is now available to ALL articles — no per-page code needed

### Existing PortableText Block Types & Parameters
- `image` — fields: `size` (small/medium/large/full), `align` (left/center/right), `caption`, `alt`
- `videoEmbed` — fields: `url`, `poster`, `caption`
- `iframeEmbed` — fields: `url`, `height`, `aspectRatio`, `caption`
- `quote` — fields: `text`, `author`, `role`
- `results` — fields: `items[]` (stat, description), `background` (none/gray/teal)
- `references` — fields: `items[]` (title, link)
- `columns` — fields: `layout` (2/3/4), `content[]`
- `backgroundSection` — fields: `color` (gray/teal/warm/orange), `content[]`
- `ctaButton` — fields: `url`, `label`, `variant` (primary/secondary), `external`, `fullWidth`
- `buttonGroup` — fields: `buttons[]`
- `divider` — fields: `style` (default/thick)
- `contactForm` — fields: `showHeader`
- Text styles: `h2`, `h2Center`, `sectionTitle`, `h3`, `h4`, `blockquote`, `callout`, `normal`
- Marks: `link`, `sup`, `textColor` (teal/orange/charcoal/gray/blue), `refCitation` (refNumber)

### Verification Scripts
- **`scripts/compare-visual.ts`** — Puppeteer visual comparison (computed styles, screenshots). Use this FIRST when migrating pages.
- **`scripts/compare-pages.ts`** — HTML structural comparison (headings, counts, classes). Use this for batch audits.
- **`scripts/audit-content.mjs`** — Sanity document quality (empty blocks, missing assets, duplicate titles).
- **`scripts/audit-site-integrity.mjs`** — Route/redirect/link/SEO validation.

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

## Content Integrity Auditing

When migrating content, adding pages, or making style changes, **always run the comparison scripts** to catch regressions.

### Primary Audit Script: `scripts/compare-pages.ts`

Compares vision pages between the live Gatsby site (goinvo.com) and the local Next.js build. Also runs standalone style audits for pages that don't exist on Gatsby (new articles).

```bash
# Start the Next.js server first
npx next build && npx next start

# Compare all vision pages (default port 3000)
npx tsx scripts/compare-pages.ts

# Compare a single page
npx tsx scripts/compare-pages.ts human-centered-design-for-ai

# Show all severity levels
npx tsx scripts/compare-pages.ts --verbose

# JSON output for programmatic use
npx tsx scripts/compare-pages.ts --json
```

**What it catches:**
- Fabricated or missing headings (EXTRA_HEADING / MISSING_HEADING)
- Heading font/weight mismatches — e.g., `header--lg` (serif light) rendered as bold sans (HEADING_STYLE)
- Wrong font on headings — h1/h2 must use `font-serif` or `header-lg`/`header-xl` (NEXT_STYLE)
- Missing margin-bottom on headings — causes text to run into the next element (NEXT_STYLE)
- h4 elements incorrectly using h3/header-md styling (NEXT_STYLE)
- Numbered headings ("1. ...") that should be h3/h4, not large serif h2 (NEXT_STYLE)
- Adjacent headings with no content between them (SPACING)
- Element count differences: images, videos, iframes, lists, superscripts, quotes (COUNT)
- Buttons rendered as plain links (LINK_NOT_BUTTON)
- Missing sections: references, authors, newsletter (MISSING_SECTION)
- Missing background sections or extra shadow styling (MISSING_STYLE / EXTRA_STYLE)

**Slug mapping:** The script maps Next.js slugs to their Gatsby equivalents (e.g., `bathroom-to-healthroom` → `from-bathroom-to-healthroom`). When adding a new vision page, add its entry to the `SLUG_MAP` in the script (value `null` if slugs match, or the Gatsby slug if different).

### Secondary Audit Script: `scripts/compare-all-pages.ts`

Compares case study and main pages (about, services, work, etc.) between Gatsby and Next.js.

```bash
npx tsx scripts/compare-all-pages.ts              # all pages
npx tsx scripts/compare-all-pages.ts --section work  # case studies only
npx tsx scripts/compare-all-pages.ts --section main  # main pages only
```

### Sanity Content Audit: `scripts/audit-content.mjs`

Checks Sanity documents (case studies + features) for structural issues:
- Duplicate title blocks, empty paragraphs, missing video URLs
- Image blocks without assets, empty references blocks
- Consecutive duplicate blocks

```bash
node scripts/audit-content.mjs
```

### Site Integrity Audit: `scripts/audit-site-integrity.mjs`

Checks all routes return 200, redirects resolve, internal links are valid, and SEO meta tags are present.

```bash
npx next build && npx next start -p 3099
node scripts/audit-site-integrity.mjs --base=http://localhost:3099
```

### Heading Style Reference

| Gatsby Class | Next.js Equivalent | Font | Weight | Size | Case |
|---|---|---|---|---|---|
| `header--xl` | `header-xl` or `font-serif text-[1.75rem] lg:text-[2.25rem] font-light` | Serif | 300 (light) | 1.75–2.25rem | Normal |
| `header--lg` | `header-lg` or `font-serif text-[1.5rem] font-light` | Serif | 300 (light) | 1.5rem | Normal |
| `header--md` | `header-md` or `font-sans text-sm font-semibold uppercase tracking-[2px]` | Sans | 600 (semibold) | 0.875rem | UPPERCASE |
| `header--sm` | `font-sans text-base font-bold` (h4 default) | Sans | 700 (bold) | 1rem | Normal |
