---
name: fix-page
description: Fix a page issue with mandatory visual verification before committing. Prevents sloppy fixes by enforcing screenshot comparison at every step.
user_invocable: true
arguments:
  - name: slug
    description: The page slug (e.g. "ai-design-certification", "healthcare-ai")
    required: true
  - name: issue
    description: Description of the issue to fix
    required: true
---

# Fix Page with Visual Verification

You MUST follow every step in order. Do NOT skip any step. Do NOT commit without completing step 6.

## Step 1: Screenshot the Gatsby reference

Take a Puppeteer screenshot of the Gatsby version at the area with the issue:
```
https://www.goinvo.com/vision/{slug}/   (or /work/{slug}/)
```
Save to `c:/tmp/fix-{slug}-gatsby.png` and READ the image to understand the correct rendering.

## Step 2: Screenshot our Next.js version

Take a Puppeteer screenshot of our version at the same area:
```
http://localhost:3000/vision/{slug}   (or /work/{slug})
```
Save to `c:/tmp/fix-{slug}-before.png` and READ the image.

## Step 3: Identify the EXACT difference

Compare both screenshots side-by-side. List every specific difference you see:
- Font size/weight/family
- Colors (exact hex values from computed styles)
- Spacing/margins/padding (exact px values)
- Missing/extra elements
- Layout differences (grid vs stack, alignment)

Use Puppeteer `getComputedStyle()` to get exact values from BOTH pages for the elements in question. Report: "Gatsby has X, we have Y" for each difference.

## Step 4: Make the fix

**BEFORE making ANY change, verify the current state:**

### For Sanity content fixes:
1. Dump the EXACT current block structure around the area you're changing
2. Identify the EXACT block key, style, and children of what you're modifying
3. State clearly: "I am changing block [key] from [X] to [Y]"
4. **NEVER modify blocks you weren't asked to modify**
5. **NEVER delete blocks unless explicitly asked to delete them**
6. **If adding content, find the EXACT insertion point by examining surrounding blocks**

### For adding missing content:
1. Find the correct position by reading BOTH the Gatsby source AND the current Sanity content
2. State: "Inserting new block AFTER block [key] which contains '[text...]'"
3. **NEVER replace existing content with the new content**
4. **ADD the new block alongside existing blocks**

### For changing block styles:
1. State the block key, current style, and target style
2. **Only change the style field — do NOT modify children, marks, or text**
3. **Use the correct component variant:**
   - `blockquote` style = italic text with orange left border (inline callout)
   - `quote` block type = large quote marks with author attribution (standalone featured quote)
   - `callout` style = highlighted box
   - Check the Gatsby reference page to see WHICH variant is actually used

### For CSS/code fixes:
- READ the file first
- Make the MINIMAL change needed

## Step 5: Rebuild

```bash
rm -rf .next && npx next build
```

If the build fails, fix the error and rebuild. Do NOT proceed until build passes.

## Step 6: Screenshot AFTER the fix

Start the server and take another screenshot at the same position:
```
http://localhost:3000/vision/{slug}
```
Save to `c:/tmp/fix-{slug}-after.png` and READ the image.

**Critical verification checklist:**
- Does the changed element match the Gatsby reference?
- Did any OTHER elements change that shouldn't have? (Compare before vs after carefully)
- Is the element in the correct POSITION on the page?
- If you added content, is it in the right place relative to surrounding content?
- If you changed a style, did you use the correct variant?

If ANY check fails, UNDO the change and redo Step 4.

## Step 7: Commit

Only after visual verification passes:
```bash
git add <changed files> && git commit -m "..." && git push
```

## HARD RULES

- NEVER commit without completing Step 6
- NEVER assume a fix worked — always screenshot and verify
- NEVER change more than what the issue describes
- NEVER modify blocks you weren't asked to modify
- NEVER replace existing content when adding new content
- NEVER delete content unless explicitly asked to
- If you notice other issues while fixing, note them but do NOT fix them in this commit
- One issue per commit, verified visually
- When the issue says "should be a quote" — check the Gatsby reference to determine WHICH quote variant (blockquote with left border vs quote block with quotation marks vs callout box)
