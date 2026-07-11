import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient } from 'sanity'

import {
  FINANCIAL_POSTURES,
  FINANCIAL_POSTURE_DOC_ID,
  FINANCIAL_POSTURE_DOC_TYPE,
  FINANCIAL_POSTURE_STALE_DAYS,
  financialPostureAgeDays,
  getFinancialPosture,
  isFinancialPostureStale,
  type FinancialPostureId,
} from '../../../lib/marketing/financialPosture'
import { OUTREACH_DATASET } from '../../../lib/marketing/outreachEnums'
import { Select, styles } from '../../tools/marketingTool'

/**
 * The finances check-in: read/set the studio's financial posture (rough runway
 * bin). The posture picks the marketing strategy the suite recommends, so the
 * assistant periodically re-confirms it — `compact` renders the Dashboard
 * nudge (only when unset or stale), the full variant is the Settings control.
 *
 * Storage is the PRIVATE outreach dataset (data-API managed doc, not a Studio
 * schema): the runway bin is candid feasibility data and the production
 * dataset is world-readable. This component is the only writer, so `setAt` is
 * always stamped alongside the posture.
 */
export function MarketingFinancialPostureSetting({
  compact = false,
  onOpenSettings,
}: {
  compact?: boolean
  onOpenSettings?: () => void
}) {
  const baseClient = useClient({ apiVersion: '2024-01-01' })
  const postureClient = useMemo(() => baseClient.withConfig({ dataset: OUTREACH_DATASET }), [baseClient])
  const [posture, setPosture] = useState<FinancialPostureId | ''>('')
  const [setAt, setSetAt] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void postureClient
      .fetch<{ posture?: string | null; setAt?: string | null } | null>(`*[_id == $id][0]{posture, setAt}`, {
        id: FINANCIAL_POSTURE_DOC_ID,
      })
      .then((value) => {
        if (!active) return
        const found = getFinancialPosture(value?.posture)
        if (found) setPosture(found.id)
        setSetAt(value?.setAt || null)
        setLoaded(true)
      })
      .catch(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [postureClient])

  const save = useCallback(
    async (value: FinancialPostureId) => {
      const previous = { posture, setAt }
      const now = new Date().toISOString()
      setPosture(value)
      setSetAt(now)
      setSaving(true)
      setSaveError(null)
      try {
        await postureClient
          .transaction()
          .createIfNotExists({ _id: FINANCIAL_POSTURE_DOC_ID, _type: FINANCIAL_POSTURE_DOC_TYPE })
          .patch(FINANCIAL_POSTURE_DOC_ID, (p) => p.set({ posture: value, setAt: now }))
          .commit()
      } catch {
        // A silent optimistic "success" would read as confirmed while nothing
        // was written — revert and say so instead.
        setPosture(previous.posture)
        setSetAt(previous.setAt)
        setSaveError('Could not save the posture — check your access and try again.')
      } finally {
        setSaving(false)
      }
    },
    [postureClient, posture, setAt],
  )

  const current = getFinancialPosture(posture)
  const ageDays = financialPostureAgeDays(setAt)
  const stale = isFinancialPostureStale(setAt)
  const ageLabel =
    ageDays === null ? 'a while ago' : ageDays === 0 ? 'today' : ageDays === 1 ? 'yesterday' : `${ageDays} days ago`

  if (compact) {
    // Dashboard check-in: quiet when the posture is fresh, a nudge when it is
    // not. "Still right" is one click if nothing changed.
    if (!loaded || (current && !stale && !saveError)) return null
    return (
      <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, borderColor: 'rgba(214, 169, 63, 0.5)', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ ...styles.small, lineHeight: 1.5 }}>
            <strong>Finances check-in:</strong>{' '}
            {current
              ? `posture is “${current.title}” (${current.runwayLabel}), confirmed ${ageLabel} — still right? The strategy the suite recommends hangs on it.`
              : 'no financial posture set. Rough runway picks the marketing strategy — set it once and the suite tailors its advice. (Stored privately, never on the public site.)'}
            {saveError && <span style={{ color: '#d98a8a' }}> {saveError}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {current && (
              <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save(current.id)}>
                {saving ? 'Saving…' : 'Still right'}
              </button>
            )}
            {onOpenSettings && (
              <button type="button" style={styles.button} onClick={onOpenSettings}>
                {current ? 'Update' : 'Set posture'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220, maxWidth: 560 }}>
          <h3 style={{ margin: '0 0 2px', fontSize: 16 }}>Financial posture{saving ? ' · saving…' : ''}</h3>
          <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.5 }}>
            Roughly how the finances stand — this picks the strategy the suite recommends. Short runway: only
            fast-closing work (reaching out to people who know us) pays in time. Longer runway: content, SEO, and
            brand earn their keep. Stored in the private dataset, never on the public site.
            {current ? ` Confirmed ${ageLabel}${stale ? ' — worth a re-check.' : '.'}` : ' Not set yet.'}
          </div>
          {current && <div style={{ ...styles.small, marginTop: 6, lineHeight: 1.5 }}>{current.strategy}</div>}
          {saveError && <div style={{ ...styles.small, color: '#d98a8a', marginTop: 6 }}>{saveError}</div>}
        </div>
        <div style={{ minWidth: 300 }}>
          <Select
            value={posture}
            options={[
              ...(posture ? [] : [{ title: 'Choose a posture…', value: '' }]),
              ...FINANCIAL_POSTURES.map((p) => ({ title: `${p.title} — ${p.runwayLabel}`, value: p.id })),
            ]}
            onChange={(value) => {
              const found = getFinancialPosture(value)
              if (found) void save(found.id)
            }}
          />
          <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
            The assistant re-checks after ~{FINANCIAL_POSTURE_STALE_DAYS} days.
          </div>
        </div>
      </div>
    </div>
  )
}
