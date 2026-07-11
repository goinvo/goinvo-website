/**
 * Financial posture — the studio's rough runway, in bins, as the input that
 * picks the marketing strategy. Strategy is a step function of runway, not a
 * dial: below a line only fast-closing work pays in time; above it the long
 * game is affordable. Humans (the principals) set the bin; the suite reads it.
 *
 * SINGLE SOURCE: the Studio setting UI, the Outreach plan panel, and the
 * assist/strategist AI prompts must all import from here — never re-hardcode
 * bin ids or copy (see CLAUDE.md "Enums, not magic strings").
 *
 * STORAGE IS PRIVATE: the chosen bin is candid feasibility data (it literally
 * says how close the studio is to running out of money), so it lives in the
 * PRIVATE `outreach` dataset — the production dataset is world-readable by
 * design, and an unauthenticated GROQ query must never be able to answer
 * "what is GoInvo's runway?". The doc below is managed purely via the data API
 * (custom Studio component + server routes), NOT a Studio schema, so nothing
 * can edit the posture without also stamping `setAt`.
 */

/** `_id`/`_type` of the posture doc in the PRIVATE outreach dataset. */
export const FINANCIAL_POSTURE_DOC_ID = 'marketingFinancialPosture'
export const FINANCIAL_POSTURE_DOC_TYPE = 'marketingFinancialPosture'

export const FINANCIAL_POSTURES = [
  {
    id: 'survival',
    title: 'Survival',
    runwayLabel: 'under ~3 months of confident runway',
    strategy:
      'Only work that can turn into cash inside the runway: direct, specific asks to people who already know our work, and close-now offers. Pause long-horizon marketing (content, SEO, brand) — it pays off too late to matter.',
    outreachWhy:
      'The studio has roughly 2–3 months of confident runway. New leads take longer than that to turn into paid work, so anything slow — content, SEO, cold outreach — can’t pay off in time. The people who already know our work say yes fastest, so the highest-value move is a direct, specific ask to past clients and contacts.',
  },
  {
    id: 'rebuild',
    title: 'Rebuild',
    runwayLabel: '~3–6 months of runway',
    strategy:
      'Fast-closing outreach still leads, but start refilling the pipeline behind it. Content only where it directly feeds a sales conversation; defer brand plays.',
    outreachWhy:
      'The studio has a few months of runway — enough to breathe, not enough to coast. Direct asks to people who already know our work still close fastest, so outreach leads while the pipeline refills behind it.',
  },
  {
    id: 'stable',
    title: 'Stable',
    runwayLabel: '~6–12 months of runway',
    strategy:
      'Balanced marketing: keep the pipeline warm, invest in content and measurement, and take positioning work seriously. Normal operating mode.',
    outreachWhy:
      'Finances are stable, so outreach is one lever among several — staying in touch with past clients compounds, and it sits alongside content and longer-horizon marketing rather than replacing them.',
  },
  {
    id: 'growth',
    title: 'Growth',
    runwayLabel: '12+ months of runway',
    strategy:
      'Long-horizon bets earn their keep: SEO, thought leadership, experiments, and brand. Outreach becomes relationship maintenance, not rescue.',
    outreachWhy:
      'With a comfortable runway, outreach is relationship maintenance — keeping past clients close while longer-horizon marketing (SEO, thought leadership, experiments) does the heavy lifting.',
  },
] as const

export type FinancialPosture = (typeof FINANCIAL_POSTURES)[number]
export type FinancialPostureId = FinancialPosture['id']

export function isFinancialPostureId(value: unknown): value is FinancialPostureId {
  return typeof value === 'string' && FINANCIAL_POSTURES.some((p) => p.id === value)
}

export function getFinancialPosture(id: string | null | undefined): FinancialPosture | null {
  return FINANCIAL_POSTURES.find((p) => p.id === id) ?? null
}

/**
 * The Outreach surface's guided flow was built for the demand-shock reality
 * (2026-07: ~2–3 months confident runway), so when no posture has been set the
 * suite assumes survival rather than pretending to know nothing.
 */
export const DEFAULT_FINANCIAL_POSTURE_ID: FinancialPostureId = 'survival'

/** After this long without re-confirmation, the setting counts as stale and the suite should check in. */
export const FINANCIAL_POSTURE_STALE_DAYS = 28

export function financialPostureAgeDays(setAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!setAt) return null
  const then = Date.parse(setAt)
  if (Number.isNaN(then)) return null
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000))
}

export function isFinancialPostureStale(setAt: string | null | undefined, now: Date = new Date()): boolean {
  const age = financialPostureAgeDays(setAt, now)
  return age === null || age >= FINANCIAL_POSTURE_STALE_DAYS
}

/**
 * Compact context block for AI prompts (assist/strategist). Data, not
 * instructions: the route adds its own system line telling the model how to
 * weigh it. `confirmed: false` means the setting is unset or stale, so the
 * model should ask the user to re-confirm rather than lean on it.
 */
export function financialPostureAiContext(
  id: string | null | undefined,
  setAt: string | null | undefined,
  now: Date = new Date(),
): {
  posture: FinancialPostureId
  runway: string
  marketingStrategy: string
  confirmed: boolean
  setDaysAgo: number | null
} {
  const posture = getFinancialPosture(id) ?? getFinancialPosture(DEFAULT_FINANCIAL_POSTURE_ID)!
  return {
    posture: posture.id,
    runway: posture.runwayLabel,
    marketingStrategy: posture.strategy,
    confirmed: isFinancialPostureId(id) && !isFinancialPostureStale(setAt, now),
    setDaysAgo: financialPostureAgeDays(setAt, now),
  }
}
