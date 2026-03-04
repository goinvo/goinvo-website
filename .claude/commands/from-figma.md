Implement a design from Figma into the GoInvo website.

## Figma URL or description

$ARGUMENTS

## Prerequisites

The Figma MCP server must be connected. If `get_design_context` fails with a connection error, guide the user through setup:

1. Run this command in the terminal (one-time, works across all projects):
   ```
   claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
   ```
2. Restart Claude Code (`exit` then `claude`)
3. Type `/mcp` and select **figma** → **Authenticate**
4. A browser window opens — click **Allow Access** to authorize with their Figma account
5. Back in Claude Code, `/mcp` should show figma as connected

Once connected, proceed with the instructions below.

## Instructions

1. **Get the design context** from the Figma URL using the Figma MCP tool (`get_design_context`). Extract the fileKey and nodeId from the URL.

2. **Analyze the design** — look at the screenshot and reference code returned. Identify:
   - Layout structure (grid, flex, sections)
   - Typography (map to `font-serif` for headings, `font-sans` for body)
   - Colors (map to the site's design tokens: primary #E36216, secondary #007385, tertiary #24434d, or Tailwind defaults)
   - Spacing and sizing (map to Tailwind spacing scale)
   - Any interactive elements (hover states, animations, forms)

3. **Adapt to the project stack** — do NOT copy the reference code verbatim. Instead:
   - Use Tailwind CSS classes (not inline styles or raw CSS)
   - Use `<Image>` from `next/image` for images
   - Use `cloudfrontImage()` for CDN image paths
   - Use existing components where possible (`<Reveal>`, `<Button>`, `<FadeIn>`, etc.)
   - Use `cn()` for conditional classes
   - Use Framer Motion for animations (match the site's easing: `[0.4, 0, 0.2, 1]`)
   - Follow responsive patterns: mobile-first with `md:` and `lg:` breakpoints

4. **Determine what to create**:
   - If it's a full page → create it under `src/app/(main)/` with proper metadata
   - If it's a component/section → create it in `src/components/` in the right subdirectory
   - If it's a Sanity content block → add the schema + renderer (see new-block workflow)
   - If it needs CMS data → add GROQ queries and Sanity schema as needed

5. **Download assets** — if the design context includes downloadable image assets, download them and place them in the appropriate location or upload to the CDN.

6. Start the dev server (`npm run dev`) so the user can compare the implementation against the Figma design side by side.
