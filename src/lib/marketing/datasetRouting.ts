/**
 * One place that decides which dataset a marketing document lives in.
 *
 * Internal planning records (calendar, research, strategy, settings) are
 * currently readable by anyone who knows the project id: Sanity's public-dataset
 * grant exposes every document whose `_id` has no dot, so today's privacy is an
 * accident of naming rather than a rule. This module is the rule.
 *
 * Deliberately free of any `sanity` import and of a hard dependency on
 * `@/sanity/env`, so it is safe in the Studio bundle as well as on the server —
 * callers pass their own public dataset in.
 */

import { OUTREACH_DATASET, OUTREACH_DATASET_TYPES } from './outreachEnums'

/**
 * The private dataset every internal type resolves to.
 *
 * Env-overridable and NEXT_PUBLIC_ so the Studio bundle sees the same value:
 * setting it back to the public dataset on Vercel reverts the entire split in
 * about a minute, with no git operation and no redeploy of code. That escape
 * hatch is the reason this is a variable rather than a constant.
 */
export const INTERNAL_DATASET =
  process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || OUTREACH_DATASET

/**
 * Every type that belongs in the private dataset.
 *
 * Starts as exactly the seven already-private types, so adding this module
 * changes no behaviour at all. Wave 1 types are appended at cutover, which is
 * the single line that moves the split from "wired" to "live".
 */
export const INTERNAL_MARKETING_TYPES: readonly string[] = [
  ...OUTREACH_DATASET_TYPES,
  // Wave 1 types are added here at cutover (Step 7).
]

export function isInternalMarketingType(type: string): boolean {
  return INTERNAL_MARKETING_TYPES.includes(type)
}

/** Which dataset a given type should be read from and written to. */
export function datasetForType(type: string, publicDataset: string): string {
  return isInternalMarketingType(type) ? INTERNAL_DATASET : publicDataset
}

type DatasetScopedClient = {
  withConfig(config: { dataset: string }): unknown
}

/**
 * Re-scope a client to the dataset a type belongs to.
 *
 * Public types get the base client back untouched; only internal types are
 * re-scoped. Deliberately does NOT inspect `base.config()` — the base client is
 * assumed to already be on the public dataset, and requiring `config()` would
 * couple this to the full Sanity client surface for no gain.
 */
export function clientForType<C extends DatasetScopedClient>(base: C, type: string): C {
  return (isInternalMarketingType(type) ? base.withConfig({ dataset: INTERNAL_DATASET }) : base) as C
}

/**
 * Refuse to run a "split" that is not a split.
 *
 * If the internal dataset is ever pointed at the public one while extra types
 * are listed as internal, every one of those types would be written straight
 * back into the world-readable dataset — the exact leak this exists to close,
 * reopened silently. Fail loudly instead.
 */
export function assertSplitIsReal(publicDataset: string): void {
  if (
    INTERNAL_MARKETING_TYPES.length > OUTREACH_DATASET_TYPES.length &&
    INTERNAL_DATASET === publicDataset
  ) {
    throw new Error(
      'The marketing dataset split is enabled but the internal dataset is the public one. ' +
        'Unset NEXT_PUBLIC_MARKETING_INTERNAL_DATASET or point it at the private dataset.',
    )
  }
}
