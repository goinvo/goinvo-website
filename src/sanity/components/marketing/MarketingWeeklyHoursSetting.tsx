import { useCallback, useEffect, useState } from 'react'
import { useClient } from 'sanity'
import { useToast } from '@sanity/ui'

import { MARKETING_SETTINGS_ID } from '../../schemas/marketingSettings'
import { styles } from '../../tools/marketingTool'
import { DEFAULT_WEEKLY_MARKETING_HOURS } from '../../../lib/marketing/effort'

/**
 * How many hours of marketing the studio has in a normal week.
 *
 * This is the number the weekly plan is fitted to. Without it the suite hands
 * over an unbounded queue, which is a list nobody works — so it belongs next to
 * the model picker as a first-class setting rather than buried in a document.
 */
export function MarketingWeeklyHoursSetting() {
  const client = useClient({ apiVersion: '2024-01-01' })
  const toast = useToast()
  const [hours, setHours] = useState<string>('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    client
      .fetch<{ weeklyMarketingHours?: number } | null>(
        `*[_id == $id][0]{ weeklyMarketingHours }`,
        { id: MARKETING_SETTINGS_ID },
      )
      .then((settings) => {
        if (cancelled) return
        setHours(String(settings?.weeklyMarketingHours ?? DEFAULT_WEEKLY_MARKETING_HOURS))
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
    const parsed = Number(hours)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.push({ status: 'warning', title: 'Enter the hours as a number greater than zero.' })
      return
    }
    setSaving(true)
    try {
      // Patch rather than replace so the model picker and brand voices survive.
      await client
        .transaction()
        .createIfNotExists({ _id: MARKETING_SETTINGS_ID, _type: 'marketingSettings' })
        .patch(MARKETING_SETTINGS_ID, (patch) => patch.set({ weeklyMarketingHours: parsed }))
        .commit()
      toast.push({ status: 'success', title: `Weekly marketing time set to ${parsed}h` })
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not save the weekly hours',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSaving(false)
    }
  }, [client, hours, toast])

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontWeight: 700, fontSize: 13 }} htmlFor="marketing-weekly-hours">
        Marketing hours a week
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          id="marketing-weekly-hours"
          type="number"
          min={0.5}
          max={40}
          step={0.5}
          disabled={!loaded || saving}
          style={{ ...styles.input, width: 110 }}
          value={hours}
          onChange={(event) => setHours(event.currentTarget.value)}
        />
        <button type="button" style={styles.button} disabled={!loaded || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p style={{ color: '#98a1b5', margin: 0, fontSize: 12, maxWidth: '52ch' }}>
        What the week is planned against. Be honest rather than aspirational — a plan built on
        hours you do not have is the one that gets abandoned.
      </p>
    </div>
  )
}
