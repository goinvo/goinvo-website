# GoInvo Website - Next.js Migration

## Current Task (2026-03-31): Port Legacy /features/ Pages to Next.js

**Goal**: Port all 12 legacy `/features/` pages from their original HTML/CSS to Next.js static override pages. These are NOT Gatsby pages — they are standalone legacy HTML pages with custom CSS served from `goinvo.com/old/`. They were never built from React/Gatsby.

### CRITICAL FINDING: All 12 /features/ pages are LEGACY HTML
These pages are **not** in the Gatsby source repo. They are standalone HTML pages with custom CSS/JS served from the `/old/` directory on goinvo.com. The Gatsby `features.json` links to them as external URLs. They each have:
- Custom CSS (10-66KB) at `/old/stylesheets/features/<slug>.css`
- Custom HTML layouts (dark backgrounds, multi-column grids, inline SVGs)
- Some have custom JS at `/old/javascripts/features/<slug>/`

**Source files downloaded to**: `/c/tmp/legacy-features/<slug>/` (page.html + styles.css)

### The 12 legacy features pages

| Gatsby slug | Next.js slug | HTML | CSS | Porting Status |
|---|---|---|---|---|
| zika | understanding-zika | 74KB | 16KB | **BROKEN** — needs port from legacy HTML |
| an-oral-history | oral-history-goinvo | 235KB | 22KB | Sanity content partial, needs legacy port |
| from-bathroom-to-healthroom | bathroom-to-healthroom | 70KB | 19KB | Sanity content partial, needs legacy port |
| careplans | care-plans | 40KB | 67KB | Sanity content OK for now |
| digital-healthcare | digital-healthcare | 43KB | 14KB | Sanity content partial |
| us-healthcare | healing-us-healthcare | 99KB | 22KB | Interactive, needs legacy port |
| disrupt | disrupt | 39KB | 33KB | Sanity content, heading differences |
| ebola | understanding-ebola | 33KB | 10KB | Sanity content OK |
| ebola-care-guideline | ebola-care-guideline | 32KB | 12KB | Sanity content OK |
| killer-truths | killer-truths | 43KB | 11KB | Full image cover done |
| print-big | print-big | 40KB | 3KB | Clean |
| redesign-democracy | redesign-democracy | 101KB | 22KB | Sanity content, heading/image gaps |

### Porting approach
1. Download the legacy HTML + CSS from `goinvo.com/old/`
2. Read the Gatsby source HTML to understand layout structure
3. Translate section by section into a Next.js `page.tsx` static override
4. Port custom CSS to Tailwind classes or scoped `<style>` blocks
5. Verify with Puppeteer side-by-side screenshots at multiple scroll positions
6. Images: use `cloudfrontImage()` for CDN paths or upload to Sanity

### Also pending: Studio UX fixes
- Quote block preview only shows first letter
- H2 (centered) / sectionTitle preview wrong in editor
- Rich text header preview formatting doesn't match live

### Previous Task (2026-03-30): Full Image Cover + Contributors (DONE)

### Previous Task (2026-03-29): Vision Page Static Override Removal

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

## Critical Rules

### NEVER replace entire code blocks when adding variants
When adding new variants, options, cases, or entries to existing code structures (switch statements, if/else chains, lookup objects, config maps, component variants), **NEVER rewrite the entire block**. Only ADD the new code alongside existing code. Replacing the full block removes existing working variants and causes regressions. This is the single most important rule — violating it destroys existing functionality.

**Example of WRONG approach:**
```
// Replacing the entire logoVariants object to add 'ai':
const logoVariants = { ai: [...], default: [...] }  // ← LOST enterprise, government, etc.
```

**Example of CORRECT approach:**
```
// Adding 'ai' to the existing object:
const logoVariants = { default: [...], enterprise: [...], government: [...], ai: [...] }
```

### Killer Truths is an exception — uses fullImageCover
The killer-truths page uses `fullImageCover: true` in Sanity to display the poster image in full size as the hero. This was explicitly requested. The static override renders the dark-themed content (title, poster, download bar, refs) directly without SetCaseStudyHero.

### Don't duplicate cover images in page content
When porting legacy pages, the cover/hero image should be used ONLY as the `SetCaseStudyHero` image. Do NOT repeat it in the page content body. If the legacy HTML has a header section with the same background image as the hero, remove the duplicate header and keep only the title text below the hero.

### Prefer adding VARIANTS to existing components over creating new ones
When a page needs a different visual treatment, add a `variant` prop or dropdown to the existing component rather than creating a new component. This keeps the Sanity Studio UX simple (one block type with a variant selector) and prevents component sprawl. If a component doesn't support the needed layout, ADD a variant to it — don't replace the component or create a parallel one.

### ALWAYS visually compare against the live Gatsby site before assuming anything is correct
Do NOT assume section order, layout, styling, or structure. Open BOTH the Gatsby page (goinvo.com/vision/{slug}/) AND the Next.js page (localhost:3000/vision/{slug}) side by side and visually compare. Check:
- Section order — varies by article, verify against the Gatsby source/live site for each page
- Image sizing (full-bleed vs constrained, Gatsby uses different containers)
- Reference formatting (citation text + separate URL link, not entire text as link)
- Author section presence and layout
- Newsletter/subscribe section background color and position
- Bold text spacing (no missing spaces around `<strong>` tags)
- Heading styles (serif vs sans, weights, uppercase)

### ALWAYS verify rendered output after making component changes
Do NOT assume a code change worked. After editing any component or page:
1. Rebuild (`rm -rf .next && npx next build`)
2. Fetch the rendered HTML and verify the change is present in the actual output
3. For client-rendered components ('use client'), check both SSR HTML and the bundled JS
4. Compare element counts, class names, and structure against the Gatsby reference
5. Never mark a visual fix as done until you've confirmed it renders correctly

When fixing a visual component to match Gatsby:
- Fetch the Gatsby page HTML first
- Identify EVERY difference, not just the obvious ones
- Fix ALL differences, not just the easy ones
- Verify the fix renders correctly before moving on
- Do NOT delegate component fixes to agents without verifying their work

### ALWAYS use Puppeteer to verify visual/spacing changes
Do NOT rely on reading CSS classes or source code to confirm spacing, sizing, or layout matches. Tailwind classes can conflict, be overridden, or not apply as expected (e.g., two `min-h-*` classes on the same element in Tailwind v4). The only reliable verification is measuring **actual rendered dimensions**.

After any spacing, sizing, or layout change:
1. Start the Next.js server (`npx next start -p 3000`)
2. Use Puppeteer to measure the actual rendered dimensions on BOTH sites:
```js
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  const metrics = await page.evaluate(() => {
    const el = document.querySelector('selector');
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      width: rect.width, height: rect.height,
      padding: style.padding, margin: style.margin,
      fontSize: style.fontSize, lineHeight: style.lineHeight,
    };
  });
  console.log(metrics);
  await browser.close();
})();
"
```
3. Compare rendered values between localhost and goinvo.com
4. Report PASS/FAIL for each metric with actual vs target values
5. Do NOT consider a fix complete until all metrics pass (within ~3px tolerance)

This catches issues that reading CSS cannot: class conflicts, specificity overrides, computed value differences, and Tailwind v4 ordering edge cases.

### Do not assume section ordering — check the Gatsby source for each page
The most common Gatsby order is content → authors → subscribe → references, but this varies. Always check `C:\Users\quest\Programming\GoInvo\goinvo.com\src\pages\vision\{slug}\index.js` for the actual order before making template changes.

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
- `backgroundSection` — fields: `color` (gray/teal/warm/orange/dark/red), `content[]`
- `buttonGroup` — fields: `buttons[]` (label, url, variant, external). Use for single or multiple buttons.
- `divider` — fields: `style` (default/thick)
- `contactForm` — fields: `showHeader`
- Text styles: `h2`, `sectionTitle` (centered h2), `h3`, `h4`, `blockquote`, `callout`, `normal`
- Marks: `link`, `sup`, `textColor` (teal/orange/charcoal/gray/blue), `refCitation` (refNumber)

### Verification & Fix Scripts
- **`scripts/compare-visual.ts`** — Puppeteer visual comparison (computed styles, screenshots). Use this FIRST when migrating pages.
- **`scripts/compare-pages.ts`** — HTML structural comparison (headings, counts, classes). Use this for batch audits.
- **`scripts/auto-fix-content.mjs`** — **AUTO-FIX** common Sanity content issues across all pages. Detects image+text pairs that should be 2-column layouts and fixes them automatically. Run with `--write` to apply. Always run this after content migrations.
- **`scripts/audit-content.mjs`** — Sanity document quality (empty blocks, missing assets, duplicate titles).
- **`scripts/audit-site-integrity.mjs`** — Route/redirect/link/SEO validation.

### ALWAYS run auto-fix after content migrations
After migrating content to Sanity or patching content blocks, ALWAYS run:
```bash
node scripts/auto-fix-content.mjs --write
```
This catches image+text pairs that should be side-by-side columns, heading level mismatches, and other structural issues that can't be caught by the simple element-count audit.

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

### Tests must NEVER fail silently
Tests that silently skip or pass when they should be checking things are worse than no tests — they create false confidence. When writing tests:
- If a precondition isn't met (e.g., server not running), **throw an error**, don't silently skip with `return`
- Never swallow errors in catch blocks — at minimum log them, prefer re-throwing
- Every test must assert something meaningful — a test that "passes" by doing no work is a bug
- Report counts: log how many items were checked so silent degradation is visible (e.g., "Checked 43 pages" vs "Checked 0 pages")
- If a test discovers N items to check, assert N > 0 before proceeding

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
