Add a new custom block type to the Sanity rich text editor (Portable Text).

## User request

$ARGUMENTS

## Instructions

This command adds a new insertable block to the rich text editor used in Case Studies, Features, Pages, and other content types.

### Step 1 — Define the schema

Open `src/sanity/schemas/objects/portableText.ts` and add a new `defineArrayMember` to the `of` array. Follow the patterns of existing blocks (columns, quote, results, videoEmbed, etc.).

- Use a camelCase `name` (e.g. `ctaBanner`, `accordion`, `imageComparison`)
- Add a human-readable `title`
- Define `fields` with clear titles, descriptions, and validation where appropriate
- Set sensible `initialValue` defaults

### Step 2 — Build the front-end component

Create a React component in `src/components/portable-text/` (or `src/components/ui/` if it's reusable outside Portable Text) that renders this block.

- Use Tailwind CSS for all styling
- Use `font-serif` for headings, `font-sans` for body text
- Follow the site's color tokens: primary (#E36216), secondary (#007385), tertiary (#24434d)
- Use Framer Motion for any animations (add `'use client'` if needed)
- Make it responsive across all breakpoints (sm, md, lg, xl)

### Step 3 — Wire it into the renderer

Open the Portable Text renderer component (likely in `src/components/portable-text/`) and add a case for the new block type that maps to the component you just created.

### Step 4 — Test

Start the dev server (`npm run dev`) and:
1. Open the Studio at `localhost:3000/studio`
2. Edit any document with a rich text field
3. Click **+ Insert** and verify the new block appears
4. Add it with sample content
5. Preview on the front end to confirm it renders correctly

Tell the user when ready to preview.
