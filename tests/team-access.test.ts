/**
 * Team permissions: everyone on the team has the principals' permissions by
 * default (the owner's call, 2026-10-05), as a setting that can be tightened.
 *
 * Rules pinned here, each of which would fail silently or dangerously:
 *   - the default is 'equal';
 *   - an API TOKEN is never the team, whatever its role (the CI read token is a
 *     Viewer, the shop webhook an Editor): only a person passes;
 *   - an unreadable setting never widens access (null = the stricter rule);
 *   - under 'byRole' only named approvers approve the intent, and none named
 *     means nobody, said out loud.
 */
import { describe, expect, it } from 'vitest'

import {
  canApproveIntent,
  DEFAULT_TEAM_ACCESS,
  describeApproval,
  isHumanAclMember,
  isHumanSessionUser,
  mayUsePrivateMarketing,
  normalizeTeamAccess,
  STRICT_TEAM_ACCESS,
} from '@/lib/marketing/teamAccess'

describe('the setting', () => {
  it('defaults to everyone having the principals’ permissions', () => {
    expect(DEFAULT_TEAM_ACCESS.mode).toBe('equal')
    expect(normalizeTeamAccess(undefined).mode).toBe('equal')
    expect(normalizeTeamAccess({ mode: 'nonsense' }).mode).toBe('equal')
    expect(normalizeTeamAccess({ mode: 'byRole', approvers: [' Jules ', 'Jules', ''] })).toEqual({ mode: 'byRole', approvers: ['Jules'] })
    expect(STRICT_TEAM_ACCESS.mode).toBe('byRole')
  })
})

describe('who is a person', () => {
  it('tells a person from an API token the way Sanity reports them', () => {
    // Shapes measured from users/me on 2026-10-05.
    expect(isHumanSessionUser({ provider: 'google', email: 'person@example.org' })).toBe(true)
    expect(isHumanSessionUser({ provider: 'sanity-token', email: null })).toBe(false)
    expect(isHumanSessionUser({ provider: 'google', email: null })).toBe(false)
    expect(isHumanSessionUser({ email: 'person@example.org' })).toBe(false)
    expect(isHumanSessionUser(null)).toBe(false)
    expect(isHumanAclMember({ isRobot: false })).toBe(true)
    expect(isHumanAclMember({ isRobot: true })).toBe(false)
    expect(isHumanAclMember({})).toBe(false)
  })
})

describe('the private marketing tools', () => {
  it('admit any person under "equal", writers only under "byRole"', () => {
    expect(mayUsePrivateMarketing({ access: DEFAULT_TEAM_ACCESS, roleNames: ['viewer'], isHuman: true })).toBe(true)
    expect(mayUsePrivateMarketing({ access: STRICT_TEAM_ACCESS, roleNames: ['viewer'], isHuman: true })).toBe(false)
    expect(mayUsePrivateMarketing({ access: STRICT_TEAM_ACCESS, roleNames: ['editor'], isHuman: true })).toBe(true)
  })

  it('never admit an API token, even an Editor under "equal"', () => {
    expect(mayUsePrivateMarketing({ access: DEFAULT_TEAM_ACCESS, roleNames: ['editor'], isHuman: false })).toBe(false)
    expect(mayUsePrivateMarketing({ access: DEFAULT_TEAM_ACCESS, roleNames: ['viewer'], isHuman: false })).toBe(false)
  })

  it('fall back to the role rule when the setting cannot be read', () => {
    expect(mayUsePrivateMarketing({ access: null, roleNames: ['viewer'], isHuman: true })).toBe(false)
    expect(mayUsePrivateMarketing({ access: null, roleNames: ['administrator'], isHuman: true })).toBe(true)
  })
})

describe('approving the intent', () => {
  it('lets anyone the team can name approve under "equal", but never "Someone"', () => {
    expect(canApproveIntent(DEFAULT_TEAM_ACCESS, 'Jules')).toBe(true)
    expect(canApproveIntent(DEFAULT_TEAM_ACCESS, 'Someone')).toBe(false)
    expect(canApproveIntent(DEFAULT_TEAM_ACCESS, '')).toBe(false)
  })

  it('limits approval to the named people under "byRole", matching first names', () => {
    const access = normalizeTeamAccess({ mode: 'byRole', approvers: ['Jules', 'Ezra Park'] })
    expect(canApproveIntent(access, 'jules')).toBe(true)
    expect(canApproveIntent(access, 'Jules Soren')).toBe(true)
    expect(canApproveIntent(access, 'Ezra')).toBe(true)
    expect(canApproveIntent(access, 'Shay')).toBe(false)
    expect(describeApproval(access)).toBe('Approved by Jules or Ezra Park (Team permissions, in Settings).')
  })

  it('lets nobody approve when "byRole" names nobody, and says how to fix it', () => {
    expect(canApproveIntent(STRICT_TEAM_ACCESS, 'Jules')).toBe(false)
    expect(describeApproval(STRICT_TEAM_ACCESS)).toMatch(/none are set/)
  })
})
