import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient } from 'sanity'
import { useToast } from '@sanity/ui'

import { clientForType } from '../../../lib/marketing/datasetRouting'
import {
  DEFAULT_TEAM_ACCESS,
  describeApproval,
  normalizeTeamAccess,
  type TeamAccess,
} from '../../../lib/marketing/teamAccess'
import { MARKETING_SETTINGS_ID } from '../../schemas/marketingSettings'
import { styles } from '../../tools/marketingTool'

/**
 * Team permissions: whether everyone on the team has the principals'
 * permissions in the marketing suite (the default — GoInvo is small), or
 * access follows Sanity roles with named approvers for the intent.
 *
 * Only a person who can already write the settings can change this (the save
 * goes through their own Studio session), so nobody can widen their own access.
 * API tokens never count as the team, whatever this says.
 */
export function MarketingTeamAccessSetting() {
  // marketingSettings moves with the dataset split, so this must not write to
  // whatever dataset the workspace happens to be on.
  const baseClient = useClient({ apiVersion: '2024-01-01' })
  const client = useMemo(() => clientForType(baseClient, 'marketingSettings'), [baseClient])
  const toast = useToast()
  const [access, setAccess] = useState<TeamAccess>(DEFAULT_TEAM_ACCESS)
  const [names, setNames] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    client
      .fetch<unknown>(`*[_id == $id][0].teamAccess`, { id: MARKETING_SETTINGS_ID })
      .then((raw) => {
        if (cancelled) return
        const read = raw ? normalizeTeamAccess(raw) : DEFAULT_TEAM_ACCESS
        setAccess(read)
        setNames(read.approvers.join(', '))
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const save = useCallback(async () => {
    const next = normalizeTeamAccess({ mode: access.mode, approvers: names.split(',').map((name) => name.trim()) })
    if (next.mode === 'byRole' && !next.approvers.length) {
      toast.push({ status: 'warning', title: 'Name at least one person who can approve our intent.' })
      return
    }
    setSaving(true)
    try {
      // Patch rather than replace so the other settings survive.
      await client
        .transaction()
        .createIfNotExists({ _id: MARKETING_SETTINGS_ID, _type: 'marketingSettings' })
        .patch(MARKETING_SETTINGS_ID, (patch) => patch.set({ teamAccess: next }))
        .commit()
      setAccess(next)
      toast.push({
        status: 'success',
        title: next.mode === 'equal' ? 'Everyone on the team now has the same permissions' : 'Permissions now follow Sanity roles',
        description: `${describeApproval(next)} Takes effect within a minute.`,
      })
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not save Team permissions',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSaving(false)
    }
  }, [access.mode, client, names, toast])

  const option = (mode: TeamAccess['mode'], label: string, detail: string) => (
    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
      <input
        type="radio"
        name="team-access"
        style={{ marginTop: 3 }}
        disabled={!loaded || saving}
        checked={access.mode === mode}
        onChange={() => setAccess({ ...access, mode })}
      />
      <span>
        <strong>{label}</strong>
        <span style={{ display: 'block', color: '#98a1b5', fontSize: 12 }}>{detail}</span>
      </span>
    </label>
  )

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontWeight: 700, fontSize: 13 }}>Team permissions</span>
      {option(
        'equal',
        'Everyone has the principals’ permissions',
        'Every person on the team can use every marketing tool, whatever their Sanity role, and anyone can approve our intent.',
      )}
      {option(
        'byRole',
        'By Sanity role',
        'Private marketing tools need an Administrator, Developer or Editor role, and only the people named here can approve our intent.',
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingLeft: 22 }}>
        <input
          aria-label="Who can approve our intent, separated by commas"
          disabled={!loaded || saving || access.mode !== 'byRole'}
          style={{ ...styles.input, minWidth: 240 }}
          placeholder="Who approves our intent: first names, commas"
          value={names}
          onChange={(event) => setNames(event.currentTarget.value)}
        />
        <button type="button" style={styles.button} disabled={!loaded || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p style={{ color: '#98a1b5', margin: 0, fontSize: 12, maxWidth: '64ch' }}>
        Either way, API tokens never count as the team, Slack guests are refused, and Marqueta keeps money,
        outreach and strategy talk to her own channels and DMs — for everyone, principals included, because a
        channel can hold people from outside the studio.
      </p>
    </div>
  )
}
