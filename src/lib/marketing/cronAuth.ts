/**
 * Who may run a scheduled marketing job.
 *
 * Cron-only, and deliberately NOT the Studio session auth the rest of the
 * marketing API uses: the tick writes the week and the check-in posts to a
 * channel of colleagues, so neither may be reachable by anything that merely
 * has a browser session open. Vercel's cron sends `Authorization: Bearer
 * <CRON_SECRET>`; `MARKETING_API_KEY` is accepted in its place so a person can
 * run a job by hand with the key they already use for the API.
 *
 * Moved here from the tick route unchanged in behaviour, so the tick and the
 * check-in answer the same request the same way — a second copy would be the
 * one that drifts the week somebody tightens the first.
 *
 * Returns null when authorised, otherwise the reason. `CRON_UNAUTHORIZED` is
 * the "wrong or missing credentials" answer (401); anything else means the
 * deployment is not configured to authenticate at all (503) — fail closed, never
 * open, when no secret is set.
 */
import { timingSafeEqual } from 'node:crypto'

export const CRON_UNAUTHORIZED = 'Unauthorized.'

export function authorizeCron(request: Pick<Request, 'headers'>, jobName = 'the tick'): string | null {
  const secret = process.env.CRON_SECRET || process.env.MARKETING_API_KEY || ''
  if (!secret) return `CRON_SECRET is not configured, so ${jobName} cannot authenticate.`
  const header = request.headers.get('authorization') || ''
  if (!sameString(header, `Bearer ${secret}`)) return CRON_UNAUTHORIZED
  return null
}

/** The HTTP status for a refusal from `authorizeCron`. */
export function cronDeniedStatus(denied: string): 401 | 503 {
  return denied === CRON_UNAUTHORIZED ? 401 : 503
}

/**
 * Plain equality, answered in constant time for equal lengths — the same
 * yes/no the tick's `===` gave, without timing how much of a guessed secret
 * matched.
 */
function sameString(actual: string, expected: string): boolean {
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
