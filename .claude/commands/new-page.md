Create a new page on the GoInvo website.

## User request

$ARGUMENTS

## Instructions

1. Create a new page route under `src/app/(main)/`. Choose the appropriate path based on the user's description.
2. Follow these conventions exactly:
   - Export `metadata` with `title` and `description` for SEO
   - Use `<Reveal>` from `@/components/ui/Reveal` for scroll animations
   - Use `font-serif` for headings, `font-sans` for body
   - Wrap content sections in `<div className="max-width content-padding">`
   - Use Tailwind CSS for all styling — no inline styles
   - Use `<Image>` from `next/image` for images, `cloudfrontImage()` for CDN paths
   - Server Component by default — only add `'use client'` if the page needs interactivity
3. If the page needs data from Sanity:
   - Add a GROQ query in `src/sanity/lib/queries.ts`
   - Use `sanityFetch` from `@/sanity/lib/live` to fetch data
   - Add TypeScript types in `src/types/index.ts` if needed
   - If it's a dynamic route (e.g. `/thing/[slug]`), add `generateStaticParams` and `generateMetadata`
4. If the page needs a new Sanity schema, create it in `src/sanity/schemas/` and register it in `src/sanity/schemas/index.ts`
5. Add the page to the sitemap by adding its path to `src/app/(main)/sitemap.xml/route.ts` if it exists, or note that it will be picked up automatically.
6. Add a link to the page in the Header navigation if appropriate (ask the user).

After creating the page, start the dev server (`npm run dev`) so the user can preview it.
