/**
 * Getting from a task in Slack to the place the work actually happens.
 *
 * Reading what needs doing and then hunting for where to do it is most of the
 * friction in the whole loop. Operations already record a `targetView`, and the
 * marketing tool already deep-links on `?view=`, so the two only had to be
 * joined — plus a `?task=` so the Studio can say, on arrival, which task sent
 * you and what it wants.
 *
 * Every Slack link lands on the THING, not just the tab: a task (`task`), a
 * contact with what to do about them (`contact` + `action`), one person's list
 * (`owner`), or a section of This week (`focus`). The Studio reads each of
 * these once and strips it, so a reload does not replay the landing.
 *
 * Pure, so the mapping is testable without a Studio.
 */

/** The Studio's own tab switch. Without it the Studio restores whatever tab was open last. */
export const MARKETING_VIEW_QUERY_PARAM = 'view'
/** Read by the Studio to show the focus banner. */
export const MARKETING_TASK_QUERY_PARAM = 'task'
/** Outreach opens this contact's record. */
export const MARKETING_CONTACT_QUERY_PARAM = 'contact'
/** …and, with it, what to do: `prep` shows the call outline, `log` opens "How did it go?". */
export const MARKETING_CONTACT_ACTION_QUERY_PARAM = 'action'
/** This week filtered to one person — "+2 more on This week" means THEIR two. */
export const MARKETING_OWNER_QUERY_PARAM = 'owner'
/** This week scrolled to one section. */
export const MARKETING_FOCUS_QUERY_PARAM = 'focus'

export type StudioContactAction = 'prep' | 'log'
export type StudioFocus = 'caught' | 'followUps' | 'decisions'

const CONTACT_ACTIONS = new Set<string>(['prep', 'log'])
const FOCUSES = new Set<string>(['caught', 'followUps', 'decisions'])

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

/**
 * The phrase `passOnTask` writes when somebody says "Not me": the task is
 * looking for an owner, not a decision (see `isDecisionTask`).
 */
const PASSED_ON = /passed on this/i

/**
 * A question somebody senior has to answer, which is not something to ask the
 * room to "take".
 *
 * The digest's "Not me" also leaves a task in needsHuman with a humanQuestion
 * ("Jen passed on this — who should pick it up?"), but that is a task looking
 * for an owner, not a decision — exactly what "Nobody has taken" is for. The
 * same phrase is what the take action checks before clearing it.
 */
export function isDecisionTask(task: { kind?: string; status?: string; humanQuestion?: string }): boolean {
  if (String(task?.kind ?? '').trim() === 'decision') return true
  const question = String(task?.humanQuestion ?? '').trim()
  return String(task?.status ?? '').trim() === 'needsHuman' && question.length > 0 && !PASSED_ON.test(question)
}

/**
 * Where a task's link lands.
 *
 * Decisions go to This week FIRST, whatever the record's `targetView` says:
 * This week is where a decision can be answered, and an outreach decision
 * linked to the Outreach tab landed on a contact list with no question on it.
 * Then the record's own view, then its kind, then This week.
 */
export function resolveTaskView(input: { targetView?: string; kind?: string; status?: string; humanQuestion?: string }): string {
  if (isDecisionTask(input)) return 'thisWeek'
  const target = String(input.targetView || '').trim()
  if (KNOWN_VIEWS.has(target)) return target
  const byKind = VIEW_BY_KIND[String(input.kind || '').trim()]
  if (byKind) return byKind
  return 'thisWeek'
}

const clipParam = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)

/**
 * The Studio URL for a view, landing on the thing the link is about.
 *
 * Returns an empty string without an absolute base URL rather than a relative
 * link: Slack needs an absolute URL and rejects a message whose button `url` it
 * cannot parse, which would look like the message simply never arriving. An
 * unknown view becomes This week — a `?view=` the Studio does not know makes it
 * restore the last-opened tab from localStorage, which once sent "open the
 * plan" to the Shop. Parameters that do not apply are left off: an `action`
 * without a `contact`, or a `focus` the page has no section for.
 */
export function studioViewUrl(
  baseUrl: string | undefined,
  view: string,
  params: {
    task?: string
    contact?: string
    contactAction?: StudioContactAction
    owner?: string
    focus?: StudioFocus
  } = {},
): string {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(base)) return ''
  const search = new URLSearchParams({ [MARKETING_VIEW_QUERY_PARAM]: KNOWN_VIEWS.has(view) ? view : 'thisWeek' })
  const task = clipParam(params.task, 180)
  if (task) search.set(MARKETING_TASK_QUERY_PARAM, task)
  const contact = clipParam(params.contact, 180)
  if (contact) {
    search.set(MARKETING_CONTACT_QUERY_PARAM, contact)
    if (params.contactAction && CONTACT_ACTIONS.has(params.contactAction)) {
      search.set(MARKETING_CONTACT_ACTION_QUERY_PARAM, params.contactAction)
    }
  }
  const owner = clipParam(params.owner, 80)
  if (owner) search.set(MARKETING_OWNER_QUERY_PARAM, owner)
  if (params.focus && FOCUSES.has(params.focus)) search.set(MARKETING_FOCUS_QUERY_PARAM, params.focus)
  return `${base}/studio/marketing?${search.toString()}`
}

/**
 * The Studio URL for a task: its view (decisions on This week), with the task
 * named so the Studio can show why you are there. Empty without a base URL or
 * a task id.
 */
export function studioTaskUrl(input: {
  baseUrl?: string
  taskId: string
  targetView?: string
  kind?: string
  status?: string
  humanQuestion?: string
}): string {
  if (!input.taskId) return ''
  return studioViewUrl(input.baseUrl, resolveTaskView(input), { task: input.taskId })
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
