Set up a new case study page on the GoInvo website.

## User request

$ARGUMENTS

## Instructions

Case studies live in Sanity CMS and render via the dynamic route at `src/app/(main)/work/[slug]/page.tsx`. To add a new one:

### Step 1 — Check the Sanity schema

Open `src/sanity/schemas/caseStudy.ts` and verify it has all the fields the user needs. If the user describes fields that don't exist yet (e.g. a new section type, custom layout, or special metadata), add them to the schema.

### Step 2 — Check the renderer

Open the case study content component (in `src/components/work/`) and make sure it renders any new fields or sections. If new Portable Text blocks are needed, also follow the new-block workflow:
1. Add the block type to `src/sanity/schemas/objects/portableText.ts`
2. Create a renderer component in `src/components/portable-text/`
3. Wire it into the Portable Text renderer

### Step 3 — Custom layout (if needed)

If the user wants a case study with a unique layout that differs from the standard template:
1. Create a new layout component in `src/components/work/`
2. Add a `layout` or `template` field to the case study schema so editors can pick the variant
3. Update the case study page to conditionally render the right layout

### Step 4 — Create content in Sanity

Tell the user to:
1. Open the Studio at `localhost:3000/studio` (or the production URL)
2. Go to **Structure** → **Case Study** → **+ Create**
3. Fill in: Title, Slug (click Generate), Hero Image, Caption, Categories, Content
4. Set Sort Order to control position on the `/work` listing
5. Click **Publish** when ready

If the user provides the content (title, description, images, etc.), offer to create it programmatically via the Sanity client.

### Step 5 — Preview

Start the dev server (`npm run dev`) and tell the user to check:
- The case study listing at `localhost:3000/work`
- The case study detail page at `localhost:3000/work/[slug]`
