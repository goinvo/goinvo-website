# Scripts

Keep this directory for reusable project maintenance tools only.

One-off Sanity migrations, page-specific patches, temporary Puppeteer probes, and generated extraction artifacts should not be committed here. If a cleanup needs to be repeatable, fold it into one of the durable tools below instead of adding another single-use script.

## Entrypoint

Use `manage.ts` for day-to-day maintenance:

```bash
npm run manage -- verify --all-viewports --flush-non-clean
npm run manage -- tree https://www.goinvo.com/vision/slug/ --diff http://localhost:3000/vision/slug
npm run manage -- compare:vision human-centered-design-for-ai --verbose
npm run manage -- audit:content
npm run manage -- audit:a11y --viewport mobile --section vision
npm run manage -- fix:content --write
npm run manage -- regression --baseline
```

Run `npm run manage -- --help` for the full task list.

## Implementation Tools

- `page-tree.ts` - primary visual/DOM/style comparison tool.
- `batch-verify.ts` - batch page-tree verification with desktop/mobile cache support.
- `compare-pages.ts` - vision page structure and parity checks.
- `compare-all-pages.ts` - case study and main-page parity checks.
- `compare-visual.ts` - screenshot and computed-style visual comparison.
- `deep-audit.ts` - broad Puppeteer audit for element-level regressions.
- `regression-test.ts` - baseline-driven CSS regression checks.
- `audit-content.mjs` - Sanity document quality checks.
- `accessibility-audit.ts` - axe-core accessibility checks plus heading, overflow, and tap-target checks.
- `auto-fix-content.mjs` - repeatable Sanity content normalization.
- `audit-site-integrity.mjs` - route, redirect, link, and SEO checks.
- `audit-superscripts.ts` - reference/superscript audit.
- `check-linebreaks.ts` - line-break and inline mark spacing audit.
- `generate-verification.mjs` - manual verification checklist generator.
- `page-tree-baselines.ts` - shared baseline helpers for page-tree tooling.
