import { useCallback, useEffect, useState } from 'react'
import { useClient } from 'sanity'

import { MARKETING_AI_MODEL_OPTIONS, MARKETING_SETTINGS_ID } from '../../schemas/marketingSettings'
import { Select, styles } from '../../tools/marketingTool'

// In-Studio picker for the marketing suite's Claude model. Reads/writes the
// `marketingSettings` singleton (the same field every AI route resolves server-
// side via resolveMarketingModel). Lets designers switch models without env vars.
export function MarketingAiModelSetting() {
  const client = useClient({ apiVersion: '2024-01-01' })
  const [model, setModel] = useState('claude-opus-4-8')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void client
      .fetch<string | null>(`*[_id == $id][0].aiModel`, { id: MARKETING_SETTINGS_ID })
      .then((value) => {
        if (active && value) setModel(value)
      })
      .catch(() => {
        /* unreadable → keep the default in the dropdown */
      })
    return () => {
      active = false
    }
  }, [client])

  const onChange = useCallback(
    async (value: string) => {
      setModel(value)
      setSaving(true)
      try {
        // Patch, don't createOrReplace — the singleton now carries sibling
        // settings (financialPosture) that a whole-document write would wipe.
        await client
          .transaction()
          .createIfNotExists({ _id: MARKETING_SETTINGS_ID, _type: 'marketingSettings' })
          .patch(MARKETING_SETTINGS_ID, (p) => p.set({ aiModel: value }))
          .commit()
      } catch {
        /* keep the optimistic value; the next load reconciles */
      } finally {
        setSaving(false)
      }
    },
    [client],
  )

  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <h3 style={{ margin: '0 0 2px', fontSize: 16 }}>AI model{saving ? ' · saving…' : ''}</h3>
          <div style={{ ...styles.small, ...styles.muted }}>
            Powers the assistant, research, and AI-citation checks. Cost is only a few dollars/month either way,
            so the default is best-quality (Opus).
          </div>
        </div>
        <div style={{ minWidth: 300 }}>
          <Select value={model} options={MARKETING_AI_MODEL_OPTIONS} onChange={(value) => void onChange(value)} />
        </div>
      </div>
    </div>
  )
}
