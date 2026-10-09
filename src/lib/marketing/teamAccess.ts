/**
 * Team permissions: who on the team may do what in the marketing suite.
 *
 * GoInvo is a small studio, and the owner's call (2026-10-05) is that everyone
 * on the team has the same permissions as the principals. That is the default
 * here, as a SETTING rather than a rule in code, so it can be tightened later
 * without a deploy:
 *
 *   - 'equal' (default): every PERSON on the team can use every Studio
 *     marketing tool whatever their Sanity role, and anyone can approve the
 *     studio's intent.
 *   - 'byRole': the Studio's private marketing tools follow Sanity roles
 *     (administrator, developer, editor), and only the named approvers can
 *     approve the intent.
 *
 * What it never changes:
 *   - ROBOTS are never "the team". A Sanity API token is a valid session too,
 *     and some carry Viewer or Editor roles (the CI read token is a Viewer, the
 *     shop webhook is an Editor). Under 'equal' a role check alone would hand a
 *     leaked read token full access to private outreach data; people only.
 *     Server-to-server callers use MARKETING_API_KEY.
 *   - Slack guests and other workspaces are still refused, and Marqueta still
 *     keeps money, outreach and strategy talk to her own channels and DMs —
 *     for everyone, principals included, because a channel can hold outsiders.
 *
 * Pure. `teamAccess.server` reads the setting; `auth` and the Studio apply it.
 */

import { isOutreachWriterRole } from './outreachEnums'

export type TeamAccessMode = 'equal' | 'byRole'

export type TeamAccess = {
  mode: TeamAccessMode
  /** Who may approve the intent in 'byRole' mode (first names, as on This week). */
  approvers: string[]
}

export const DEFAULT_TEAM_ACCESS: TeamAccess = { mode: 'equal', approvers: [] }

/** What to assume when the setting cannot be read: the stricter rule, never the wider one. */
export const STRICT_TEAM_ACCESS: TeamAccess = { mode: 'byRole', approvers: [] }

const clean = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

export function normalizeTeamAccess(raw: unknown): TeamAccess {
  const record = (raw || {}) as Record<string, unknown>
  const approvers = Array.isArray(record.approvers)
    ? [...new Set(record.approvers.map((name) => clean(name)).filter(Boolean))]
    : []
  return { mode: record.mode === 'byRole' ? 'byRole' : 'equal', approvers }
}

/* ---------------------------------------------------------------------------
 * Who is a person.
 * ------------------------------------------------------------------------- */

/**
 * Is this Sanity identity a person rather than an API token?
 *
 * Read from Sanity's own answers (checked 2026-10-05): `/users/me` for a token
 * says `provider: "sanity-token"` and has no email; for a person it names the
 * sign-in provider and has an email. The project ACL says `isRobot`. Anything
 * that does not positively look like a person is not one — fail closed.
 */
export function isHumanSessionUser(user: { provider?: unknown; email?: unknown } | null | undefined): boolean {
  if (!user) return false
  const provider = clean(user.provider).toLowerCase()
  if (!provider || provider === 'sanity-token') return false
  return Boolean(clean(user.email))
}

export function isHumanAclMember(acl: { isRobot?: unknown } | null | undefined): boolean {
  return Boolean(acl) && acl!.isRobot === false
}

/* ---------------------------------------------------------------------------
 * What a person may do.
 * ------------------------------------------------------------------------- */

/**
 * May this person use the Studio's private marketing tools (the routes that
 * run with the server's write token)? A person only; then any role under
 * 'equal', a writer role under 'byRole'. `access` null = the setting could not
 * be read: role rules apply (never widen access on a failed read).
 */
export function mayUsePrivateMarketing(input: {
  access: TeamAccess | null
  roleNames: string[]
  isHuman: boolean
}): boolean {
  if (!input.isHuman) return false
  if (input.roleNames.some((role) => isOutreachWriterRole(role))) return true
  return input.access?.mode === 'equal'
}

const firstName = (name: string) => clean(name).split(/\s+/)[0]?.toLowerCase() || ''

/**
 * May this person approve the intent? 'equal': anyone the team can name.
 * 'byRole': the named approvers, matched on the whole or first name ("Jules"
 * on the board, "Jules Soren" in Slack). 'Someone' — the resolver's word for
 * nobody it could name — never approves.
 */
export function canApproveIntent(access: TeamAccess, personName: string): boolean {
  const name = clean(personName)
  if (!name || /^someone$/i.test(name)) return false
  if (access.mode === 'equal') return true
  return access.approvers.some(
    (approver) => approver.toLowerCase() === name.toLowerCase() || firstName(approver) === firstName(name),
  )
}

/** One line on who can approve the intent, for the card and a refusal. */
export function describeApproval(access: TeamAccess): string {
  if (access.mode === 'equal') return 'Anyone on the team can approve it (Team permissions, in Settings).'
  if (!access.approvers.length) return 'Only named approvers can approve it, and none are set — add them under Team permissions in Settings.'
  const names = access.approvers
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
  return `Approved by ${list} (Team permissions, in Settings).`
}
