/**
 * Single source of truth for the "custom component" portable-text block.
 *
 * The same canonical name list drives three places that MUST agree, and used to
 * be hand-maintained separately (so they could silently drift):
 *   1. the Studio dropdown an editor picks from (schema `options.list`),
 *   2. the renderer's dispatch switch (which name maps to which React component),
 *   3. schema validation (is the saved name one the page can actually render?).
 *
 * Keeping them in one place means an editor can only pick a name the page can
 * render, and a name the page can't render fails validation with a clear message
 * instead of silently rendering an "Unknown custom component" placeholder.
 */
export interface CustomComponentOption {
  /** Canonical name stored in content and dispatched on by the renderer. */
  value: string
  /** Human-readable label shown in the Studio dropdown. */
  title: string
  /** Legacy / alternate spellings the renderer also accepts (kept working). */
  aliases?: string[]
}

export const CUSTOM_COMPONENTS: CustomComponentOption[] = [
  { value: 'virtualCareTop15Table', title: 'Virtual Care: Top 15 Table' },
  { value: 'virtualCareTimeToDiagnosis', title: 'Virtual Care: Time to Diagnosis' },
  { value: 'fihcFaceDevelopmentSection', title: 'FIHC: Face Development Section' },
  { value: 'fihcPersuasionEmotionSection', title: 'FIHC: Persuasion Emotion Section' },
  {
    value: 'ipsosWorkflowWidget',
    title: 'Ipsos Research Workflow Widget',
    aliases: [
      'ipsosResearchWorkflowWidget',
      'ipsosResearchWorkflow',
      'ipsosWorkflow',
      'ipsosFlowWidget',
      'ipsosFlowWorkflow',
      'ipsosWorkflowDiagram',
    ],
  },
  { value: 'lonelinessIsolationCosts', title: 'Loneliness: Isolation Costs' },
  { value: 'lonelinessRiskOverview', title: 'Loneliness: Risk Overview' },
  { value: 'lonelinessFeelingSection', title: 'Loneliness: Feeling Section' },
  { value: 'lonelinessTimelineSection', title: 'Loneliness: Timeline Section' },
  { value: 'lonelinessResilienceSection', title: 'Loneliness: Resilience Section' },
]

/** `{title, value}` entries for the Sanity dropdown (`options.list`). */
export const CUSTOM_COMPONENT_OPTIONS = CUSTOM_COMPONENTS.map(({ title, value }) => ({ title, value }))

/**
 * Normalize a stored name the way the renderer historically did: an editor may
 * save a PascalCase name ("IpsosWorkflowWidget") but the canonical names are
 * camelCase, so lowercase the first letter. Callers strip stega metadata first.
 */
export function normalizeCustomComponentName(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim()
  return trimmed ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : ''
}

const CANONICAL_BY_NAME = new Map<string, string>()
for (const component of CUSTOM_COMPONENTS) {
  CANONICAL_BY_NAME.set(component.value, component.value)
  for (const alias of component.aliases ?? []) CANONICAL_BY_NAME.set(alias, component.value)
}

/** Resolve any stored / aliased / mis-cased name to its canonical value, or null if unknown. */
export function resolveCustomComponentName(raw: string | undefined | null): string | null {
  return CANONICAL_BY_NAME.get(normalizeCustomComponentName(raw)) ?? null
}

/** True when the name resolves to a real, renderable component. */
export function isKnownCustomComponentName(raw: string | undefined | null): boolean {
  return resolveCustomComponentName(raw) !== null
}
