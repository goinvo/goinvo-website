# GoInvo Website

[![CI](https://github.com/goinvo/goinvo-website/actions/workflows/ci.yml/badge.svg)](https://github.com/goinvo/goinvo-website/actions/workflows/ci.yml)

The website for [GoInvo](https://www.goinvo.com), a healthcare design + engineering studio —
rebuilt on **Next.js 16** (App Router) with a **Sanity** CMS, migrated from Gatsby. Beyond the
marketing site it includes a custom marketing-operations suite and a privacy-respecting,
blocker-resilient A/B testing system.

## Highlights

- **First-party A/B measurement.** Experiment exposures, conversions, and engagement
  (time-on-page, bounce) are captured through a same-origin beacon — so the ~95% of analytics
  events that ad/privacy blockers strip from a third-party tag are still counted. Google
  Analytics is fed the same events **server-side** via the Measurement Protocol, so it stays the
  reporting hub with accurate numbers. See [ADR-001](docs/engineering-practices.md).
- **Portable marketing CMS.** A custom Sanity Studio tool (content calendar, channels, funnels,
  campaigns, research, SEO) backed by a fail-closed REST API, with the write/derive logic in a
  site-agnostic core so the suite can be lifted into another Sanity site.
- **Faithful Gatsby → Next migration.** Ported with visual-regression guards (per-pixel +
  content diffs against the original render) to catch "dead-CSS" regressions.

## Tech stack

Next.js 16 · React 19 · TypeScript · Sanity · Tailwind CSS v4 · Framer Motion ·
Vercel (hosting, KV, Web Analytics, Flags) · Vitest

## Quality gates

Every push and PR runs [CI](.github/workflows/ci.yml): **type-check** (`tsc`), **lint** (ESLint),
**unit + integration tests** (Vitest, 400+), and a **production build**. Durable practices and
architecture decisions live in [`docs/engineering-practices.md`](docs/engineering-practices.md);
open work is tracked in [Issues](https://github.com/goinvo/goinvo-website/issues).

## Getting started

```bash
npm install --legacy-peer-deps   # Next 16 + next-sanity peer deps
npm run dev                      # http://localhost:3000
```

Useful scripts: `npm test` (Vitest), `npm run lint`, `npm run build`,
`npm run check:charts` (chart-label-alignment guard). The Sanity Studio is embedded at `/studio`.
