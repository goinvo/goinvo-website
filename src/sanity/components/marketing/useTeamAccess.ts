import { useEffect, useMemo, useState } from 'react'
import type { SanityClient } from 'sanity'

import { clientForType } from '../../../lib/marketing/datasetRouting'
import { DEFAULT_TEAM_ACCESS, normalizeTeamAccess, type TeamAccess } from '../../../lib/marketing/teamAccess'
import { MARKETING_SETTINGS_ID } from '../../schemas/marketingSettings'

/**
 * The Team permissions setting, for screens that hide or show actions by it.
 *
 * Null until read (and if the read fails): screens treat null as the stricter
 * rule, so an action never flashes into view for someone and then disappears.
 * The server checks the same setting on every call; this only decides what to
 * draw.
 */
export function useTeamAccess(client: SanityClient): TeamAccess | null {
  const settingsClient = useMemo(() => clientForType(client, 'marketingSettings'), [client])
  const [access, setAccess] = useState<TeamAccess | null>(null)
  useEffect(() => {
    let cancelled = false
    settingsClient
      .fetch<unknown>(`*[_id == $id][0].teamAccess`, { id: MARKETING_SETTINGS_ID })
      .then((raw) => {
        if (!cancelled) setAccess(raw ? normalizeTeamAccess(raw) : DEFAULT_TEAM_ACCESS)
      })
      .catch(() => {
        if (!cancelled) setAccess(null)
      })
    return () => {
      cancelled = true
    }
  }, [settingsClient])
  return access
}
