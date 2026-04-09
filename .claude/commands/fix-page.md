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

Now make the MINIMAL change needed. Before changing anything:
- If it's a Sanity content fix, check the EXACT current value first
- If it's a CSS fix, check the EXACT current class/style first  
- If it's a code fix, READ the file first
- NEVER guess — always verify the current state before changing

Make the fix.

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

Compare the AFTER screenshot against the Gatsby screenshot from Step 1:
- Does the fix match? List remaining differences.
- If it does NOT match, go back to Step 4 and fix again.
- Do NOT proceed to Step 7 until the after screenshot matches Gatsby.

## Step 7: Commit

Only after visual verification passes:
```bash
git add <changed files> && git commit -m "..." && git push
```

## HARD RULES

- NEVER commit without completing Step 6
- NEVER assume a fix worked — always screenshot and verify
- NEVER change more than what the issue describes
- If you notice other issues while fixing, note them but do NOT fix them in this commit
- One issue per commit, verified visually
