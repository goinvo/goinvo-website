# Homepage hero experiment

The new `home-hero-runway` experiment compares the current Ipsos hero (`control`) with the handwritten “Everything is designed” hero and animated work runway (`runway`) from [PR #57](https://github.com/goinvo/goinvo-website/pull/57). Only the hero changes. The prints section remains visible to everyone.

The Flags SDK selects a deterministic 50/50 cohort using the existing year-long marketing visitor cookie and a fresh experiment seed. The internal experiment route decodes that assignment before rendering. Both variants are present in server HTML and retain the homepage metadata and canonical URL. A new measurement key keeps historical test results separate.

Preview locally:

- [Current Ipsos hero](http://localhost:3000/?home-hero-runway-variant=control)
- [New runway hero](http://localhost:3000/?home-hero-runway-variant=runway)

Forced previews are excluded from exposure, engagement, and experiment conversion measurement. Normal visits track through the existing first-party collector and KV rollup. Primary metric: qualified discovery-call clicks. Supporting metrics: booked calls, work exploration, and discovery-form starts.

## Deployment

The code starts the split when deployed to an environment with `FLAGS_SECRET`. Without that secret on Vercel, the existing proxy falls back to the current hero. The new flag needs no `FLAGS` toggle or external flag-service setup. Production also needs the existing KV, Sanity write access, and drain-cron configuration to populate the readout.

The Sanity experiment record `experiment-home-hero-runway` is prepared in the internal marketing dataset with status `idea`, pending deployment. At deployment, set its status to `running` and `measurementStart` to the deployment time. Studio status documents the rollout; assignment is controlled by the code registry. The idempotent `node scripts/setup-home-hero-experiment.mjs --write` command creates a missing record without overwriting subsequent Studio edits or historical experiments.

To stop assignment and return everyone to the current hero, retire `homeHeroExperiment` in the registry and redeploy. Keep the record and existing flags for historical reporting.

## Verification

Run the targeted unit tests:

```sh
npx vitest run tests/experiments.test.ts tests/home-hero-experiment.test.ts tests/marketing-security-boundaries.test.ts
```

After a clean production build and `npx next start -p 3000`:

```sh
node scripts/verify-home-hero.mjs
npx tsx scripts/manage.ts compare:all --section main Homepage --verbose
```

The Puppeteer script measures desktop/mobile hero, heading, copy, and CTA dimensions against the live control and PR preview (3px tolerance), checks broken images and overflow, and verifies SSR, sticky assignment, exposure deduplication, CTA attribution, preview exclusion, and reduced motion. QA beacons are captured in the browser without sending counts to shared KV. Results and screenshots are written to `.audit/home-hero-*`.

Verified 2026-09-08: clean production build, 70 targeted tests, changed-file lint, and homepage structural comparison passed. All 96 measured properties passed. Dimensions below are actual / target in pixels.

| Viewport and variant | Hero height | Heading width | CTA height | Result |
| --- | --- | --- | --- | --- |
| 1440px control | 1028.69 / 1028.69 | 509.17 / 509.17 | 54.38 / 54.38 | PASS (24/24) |
| 1440px runway | 1147.69 / 1147.69 | 1168.00 / 1168.00 | 54.38 / 54.38 | PASS (24/24) |
| 390px control | 935.53 / 935.53 | 254.58 / 254.58 | 54.38 / 54.38 | PASS (24/24) |
| 390px runway | 773.80 / 773.80 | 350.00 / 350.00 | 54.38 / 54.38 | PASS (24/24) |
