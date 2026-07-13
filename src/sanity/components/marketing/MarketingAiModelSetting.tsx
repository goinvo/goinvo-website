import { useCallback, useEffect, useState } from 'react'
import { useClient, type SanityClient } from 'sanity'

import { MARKETING_AI_MODEL_OPTIONS, MARKETING_SETTINGS_ID } from '../../schemas/marketingSettings'
import { Select, styles } from '../../tools/marketingTool'

type MarketingSettingsClient = Pick<SanityClient, 'transaction'>

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

/** Persist a model change, rolling the optimistic selection back on failure. */
export async function saveMarketingAiModelChange({
  client,
  nextModel,
  previousModel,
  setModel,
}: {
  client: MarketingSettingsClient
  nextModel: string
  previousModel: string
  setModel: (model: string) => void
}): Promise<string | null> {
  setModel(nextModel)
  try {
    // Patch instead of replacing the singleton so sibling settings are preserved.
    await client
      .transaction()
      .createIfNotExists({ _id: MARKETING_SETTINGS_ID, _type: 'marketingSettings' })
      .patch(MARKETING_SETTINGS_ID, (patch) => patch.set({ aiModel: nextModel }))
      .commit()
    return null
  } catch (error) {
    setModel(previousModel)
    const message = errorMessage(error, 'The AI model could not be saved.')
    return `${/[.!?]$/.test(message) ? message : `${message}.`} Your previous selection was restored.`
  }
}

// In-Studio picker for the marketing suite's Claude model. Reads/writes the
// `marketingSettings` singleton (the same field every AI route resolves server-
// side via resolveMarketingModel). Lets designers switch models without env vars.
export function MarketingAiModelSetting() {
  const client = useClient({ apiVersion: '2024-01-01' })
  const [model, setModel] = useState('claude-opus-4-8')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void client
      .fetch<string | null>(`*[_id == $id][0].aiModel`, { id: MARKETING_SETTINGS_ID })
      .then((value) => {
        if (active && value) setModel(value)
      })
      .catch((loadError) => {
        if (active) {
          setError(errorMessage(loadError, 'The saved AI model could not be loaded; the default is shown.'))
        }
      })
    return () => {
      active = false
    }
  }, [client])

  const onChange = useCallback(
    async (value: string) => {
      const previousModel = model
      setSaving(true)
      setError(null)
      try {
        const saveError = await saveMarketingAiModelChange({
          client,
          nextModel: value,
          previousModel,
          setModel,
        })
        setError(saveError)
      } finally {
        setSaving(false)
      }
    },
    [client, model],
  )

  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <h2 style={{ margin: '0 0 2px', fontSize: 16 }}>AI model{saving ? ' · saving…' : ''}</h2>
          <div style={{ ...styles.small, ...styles.muted }}>
            Powers the assistant, research, and AI-citation checks. Cost is only a few dollars/month either way,
            so the default is best-quality (Opus).
          </div>
        </div>
        <div style={{ minWidth: 300 }}>
          <Select
            ariaLabel="AI model"
            value={model}
            options={MARKETING_AI_MODEL_OPTIONS}
            disabled={saving}
            onChange={(value) => void onChange(value)}
          />
        </div>
      </div>
      {error && (
        <div role="alert" style={{ ...styles.small, color: 'var(--card-fg-color)', marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  )
}
