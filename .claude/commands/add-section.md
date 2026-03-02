Add a new section to an existing page on the GoInvo website.

## User request

$ARGUMENTS

## Instructions

1. **Identify the target page** — ask the user which page to modify if not clear. Common pages:
   - Homepage: `src/components/home/HomeContent.tsx`
   - About: `src/app/(main)/about/page.tsx`
   - Work: `src/app/(main)/work/page.tsx`
   - Services: `src/app/(main)/services/page.tsx`
   - Vision: `src/app/(main)/vision/page.tsx`
   - Contact: `src/app/(main)/contact/page.tsx`

2. **Read the existing page** to understand its structure, existing sections, and style patterns.

3. **Create the section** following these conventions:
   - Wrap in `<Reveal>` for scroll-triggered entrance animation
   - Use `<div className="max-width content-padding py-8 lg:py-12">` for standard content width
   - Use `font-serif` for section headings, `font-sans` for body
   - Tailwind CSS for all styling — match the spacing, color, and layout patterns of adjacent sections
   - If the section is complex, extract it into its own component file in the appropriate `src/components/` subdirectory

4. **If the section needs CMS data**:
   - Add fields to the relevant Sanity schema or create a new one
   - Add a GROQ query in `src/sanity/lib/queries.ts`
   - Fetch data with `sanityFetch` and pass it to the section component

5. Place the section in the correct position within the page (ask the user if the position isn't obvious).

6. Start the dev server (`npm run dev`) so the user can preview the result.
