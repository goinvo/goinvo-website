/**
 * Getting from a task in Slack to the place the work actually happens.
 *
 * Reading what needs doing and then hunting for where to do it is most of the
 * friction in the whole loop. Operations already record a `targetView`, and the
 * marketing tool already deep-links on `?view=`, so the two only had to be
 * joined — plus a `?task=` so the Studio can say, on arrival, which task sent
 * you and what it wants.
 *
 * Pure, so the mapping is testable without a Studio.
 */

/** Read by the Studio to show the focus banner. */
export const MARKETING_TASK_QUERY_PARAM = 'task'

/**
 * A task's `targetView` is a hint, not a guarantee — it is free text on the
 * document. Anything unrecognised falls back to the week view rather than
 * producing a link that lands nowhere.
 */
const KNOWN_VIEWS = new Set([
  'thisWeek',
  'dashboard',
  'strategy',
  'strategyBrief',
  'abTesting',
  'research',
  'outreach',
  'workEvidence',
  'calendar',
  'campaigns',
  'funnels',
  'templates',
  'channels',
  'analytics',
  'linkTree',
  'shop',
  'seo',
])

/** Kinds of work that have an obvious home, when the record does not name one. */
const VIEW_BY_KIND: Record<string, string> = {
  outreach: 'outreach',
  content: 'calendar',
  research: 'research',
  measurement: 'analytics',
}

export function resolveTaskView(input: { targetView?: string; kind?: string }): string {
  const target = String(input.targetView || '').trim()
  if (KNOWN_VIEWS.has(target)) return target
  const byKind = VIEW_BY_KIND[String(input.kind || '').trim()]
  if (byKind) return byKind
  return 'thisWeek'
}

/**
 * The Studio URL for a task.
 *
 * Returns an empty string without a base URL rather than a relative link:
 * Slack needs an absolute URL and silently drops a button whose `url` it cannot
 * parse, which would look like the button simply not working.
 */
export function studioTaskUrl(input: {
  baseUrl?: string
  taskId: string
  targetView?: string
  kind?: string
}): string {
  const base = String(input.baseUrl || '').replace(/\/+$/, '')
  if (!base || !input.taskId) return ''
  const view = resolveTaskView(input)
  const params = new URLSearchParams({ view, [MARKETING_TASK_QUERY_PARAM]: input.taskId })
  return `${base}/studio/marketing?${params.toString()}`
}

/**
 * Can this be finished in Slack, or does it need the Studio?
 *
 * A decision is a question with a written answer, so it can be answered in a
 * modal. Writing an article cannot. Being honest about the difference is what
 * stops the modal offering a text box for work that needs a person and a
 * keyboard elsewhere.
 */
export function isAnswerableInSlack(input: { kind?: string; humanQuestion?: string }): boolean {
  return Boolean(String(input.humanQuestion || '').trim()) && String(input.kind || '') === 'decision'
}
