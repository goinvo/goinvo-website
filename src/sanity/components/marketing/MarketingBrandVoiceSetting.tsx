import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient } from 'sanity'

import {
  normalizeMarketingBrandVoices,
  prepareMarketingBrandVoices,
  type MarketingBrandVoice,
} from '../../../lib/marketing/brandVoice'
import { MARKETING_SETTINGS_ID } from '../../schemas/marketingSettings'
import { styles, useMarketingUnsavedGuard } from '../../tools/marketingTool'

export const MARKETING_BRAND_VOICE_UNSAVED_ID = 'marketing-brand-voice-settings'

type SettingsSnapshot = {
  _rev?: string
  brandVoices?: unknown[]
}

function brandVoiceKey() {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `voice-${random}`.replace(/[^a-zA-Z0-9_-]/g, '')
}

function newBrandVoice(makeDefault: boolean): MarketingBrandVoice {
  return {
    _key: brandVoiceKey(),
    name: '',
    purpose: '',
    guidance: '',
    do: [],
    avoid: [],
    examples: [],
    status: 'active',
    isDefault: makeDefault,
  }
}

function lines(value: string, maxItems: number) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

function messageForError(error: unknown) {
  const message = error instanceof Error && error.message ? error.message : 'The brand voices could not be saved.'
  if (/revision|conflict|mismatch/i.test(message)) {
    return 'Someone changed Marketing Settings while you were editing. Reload the saved voices, then apply your changes again.'
  }
  return message
}

/**
 * Shared voice-library editor. The singleton is public-site configuration, so
 * the UI calls out the publish-safe boundary before anyone pastes examples.
 */
export function MarketingBrandVoiceSetting() {
  const client = useClient({ apiVersion: '2024-01-01' })
  const { clearUnsavedChanges, markUnsavedChange } = useMarketingUnsavedGuard()
  const [voices, setVoices] = useState<MarketingBrandVoice[]>([])
  const [savedVoices, setSavedVoices] = useState<MarketingBrandVoice[]>([])
  const [expandedVoiceKeys, setExpandedVoiceKeys] = useState<Set<string>>(new Set())
  const [revision, setRevision] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const value = await client.fetch<SettingsSnapshot | null>(
        `*[_id == $id][0]{_rev, brandVoices[]{_key, name, purpose, guidance, do, avoid, examples, status, isDefault}}`,
        { id: MARKETING_SETTINGS_ID },
      )
      const found = normalizeMarketingBrandVoices(value?.brandVoices)
      setVoices(found)
      setSavedVoices(found)
      setExpandedVoiceKeys(new Set(found.filter((voice) => voice.isDefault).map((voice) => voice._key)))
      setRevision(value?._rev)
      setDirty(false)
      setNotice(null)
      clearUnsavedChanges(MARKETING_BRAND_VOICE_UNSAVED_ID)
    } catch (loadError) {
      setError(messageForError(loadError))
    } finally {
      setLoading(false)
    }
  }, [clearUnsavedChanges, client])

  useEffect(() => {
    void load()
  }, [load])

  const activeVoices = useMemo(() => voices.filter((voice) => voice.status === 'active'), [voices])
  const defaultVoice = activeVoices.find((voice) => voice.isDefault) || activeVoices[0]

  const change = useCallback(
    (update: (current: MarketingBrandVoice[]) => MarketingBrandVoice[]) => {
      setVoices((current) => update(current))
      setDirty(true)
      setNotice(null)
      setError(null)
      markUnsavedChange(MARKETING_BRAND_VOICE_UNSAVED_ID, 'brand voice library')
    },
    [markUnsavedChange],
  )

  const updateVoice = useCallback(
    <K extends keyof MarketingBrandVoice>(key: string, field: K, value: MarketingBrandVoice[K]) => {
      change((current) =>
        current.map((voice) => (voice._key === key ? { ...voice, [field]: value } : voice)),
      )
    },
    [change],
  )

  const setDefault = useCallback(
    (key: string) => {
      change((current) =>
        current.map((voice) => ({
          ...voice,
          isDefault: voice.status === 'active' && voice._key === key,
        })),
      )
    },
    [change],
  )

  const addVoice = useCallback(() => {
    const voice = newBrandVoice(!voices.some((item) => item.status === 'active'))
    setExpandedVoiceKeys((current) => new Set([...current, voice._key]))
    change((current) => [...current, voice])
  }, [change, voices])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const prepared = prepareMarketingBrandVoices(voices)
      await client
        .transaction()
        .createIfNotExists({ _id: MARKETING_SETTINGS_ID, _type: 'marketingSettings' })
        .patch(MARKETING_SETTINGS_ID, (patch) => {
          const next = patch.set({ brandVoices: prepared })
          return revision ? next.ifRevisionId(revision) : next
        })
        .commit()

      const fresh = await client.fetch<SettingsSnapshot | null>(
        `*[_id == $id][0]{_rev, brandVoices[]{_key, name, purpose, guidance, do, avoid, examples, status, isDefault}}`,
        { id: MARKETING_SETTINGS_ID },
      )
      const persisted = normalizeMarketingBrandVoices(fresh?.brandVoices || prepared)
      setVoices(persisted)
      setSavedVoices(persisted)
      setRevision(fresh?._rev)
      setDirty(false)
      setNotice(
        persisted.some((voice) => voice.status === 'active')
          ? 'Brand voices saved. New outward-facing drafts will use the default unless a workflow selects another voice.'
          : 'Brand voice library saved with no active voice; generation will use its neutral fallback.',
      )
      clearUnsavedChanges(MARKETING_BRAND_VOICE_UNSAVED_ID)
    } catch (saveError) {
      setError(messageForError(saveError))
    } finally {
      setSaving(false)
    }
  }, [clearUnsavedChanges, client, revision, voices])

  const reset = useCallback(() => {
    setVoices(savedVoices)
    setDirty(false)
    setError(null)
    setNotice(null)
    clearUnsavedChanges(MARKETING_BRAND_VOICE_UNSAVED_ID)
  }, [clearUnsavedChanges, savedVoices])

  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240, maxWidth: 700 }}>
          <h2 style={{ margin: '0 0 2px', fontSize: 16 }}>Brand voices{saving ? ' · saving…' : ''}</h2>
          <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.5 }}>
            Save how the studio or a principal should sound once, then reuse it in outward-facing drafts across the
            suite. Research facts, evidence, scoring, citations, prices, and internal analysis stay voice-neutral.
          </div>
          <div style={{ ...styles.small, marginTop: 6, lineHeight: 1.5 }}>
            <strong>Publish-safe guidance only.</strong> These profiles live with public site configuration. Do not
            paste private client details, private emails, credentials, or claims the studio cannot substantiate.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...styles.small, ...styles.muted }}>
            {defaultVoice ? `Default: ${defaultVoice.name || 'Untitled voice'}` : 'No active default'}
          </span>
          <button
            type="button"
            style={styles.button}
            disabled={loading || saving || voices.length >= 20}
            onClick={addVoice}
          >
            Add voice
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ ...styles.small, ...styles.muted, margin: '12px 0 0' }}>Loading saved voices…</p>
      ) : voices.length === 0 ? (
        <div style={{ ...styles.guidePanel, boxShadow: 'none', marginTop: 12, padding: 12 }}>
          <strong>No voice profiles yet.</strong>
          <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
            Add the studio voice or a principal’s voice. Nothing changes until you save it.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {voices.map((voice, index) => (
            <details
              key={voice._key}
              open={expandedVoiceKeys.has(voice._key)}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open
                setExpandedVoiceKeys((current) => {
                  const next = new Set(current)
                  if (isOpen) next.add(voice._key)
                  else next.delete(voice._key)
                  return next
                })
              }}
              style={{ ...styles.guidePanel, boxShadow: 'none', padding: 10 }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
                {voice.name || `New voice ${index + 1}`}
                {voice.status === 'archived' ? ' · archived' : voice.isDefault ? ' · default' : ''}
              </summary>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <label style={styles.label}>
                    Voice name
                    <input
                      aria-label={`Voice name ${index + 1}`}
                      style={styles.input}
                      maxLength={80}
                      value={voice.name}
                      placeholder="Studio voice or Juhan"
                      onChange={(event) => updateVoice(voice._key, 'name', event.currentTarget.value)}
                    />
                  </label>
                  <label style={styles.label}>
                    Best used for
                    <input
                      aria-label={`Best used for ${voice.name || `voice ${index + 1}`}`}
                      style={styles.input}
                      maxLength={280}
                      value={voice.purpose || ''}
                      placeholder="Principal outreach, public essays…"
                      onChange={(event) => updateVoice(voice._key, 'purpose', event.currentTarget.value)}
                    />
                  </label>
                  <label style={styles.label}>
                    Status
                    <select
                      aria-label={`Status for ${voice.name || `voice ${index + 1}`}`}
                      style={styles.input}
                      value={voice.status}
                      onChange={(event) => updateVoice(voice._key, 'status', event.currentTarget.value as 'active' | 'archived')}
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                </div>

                {voice.status === 'active' && (
                  <label style={{ ...styles.small, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="marketing-default-brand-voice"
                      checked={voice.isDefault || (!voices.some((item) => item.isDefault && item.status === 'active') && activeVoices[0]?._key === voice._key)}
                      onChange={() => setDefault(voice._key)}
                    />
                    Use {voice.name || 'this voice'} as the suite default
                  </label>
                )}

                <label style={styles.label}>
                  Voice guidance
                  <textarea
                    aria-label={`Voice guidance for ${voice.name || `voice ${index + 1}`}`}
                    style={{ ...styles.input, minHeight: 100 }}
                    maxLength={2400}
                    value={voice.guidance || ''}
                    placeholder="Plainspoken, direct, curious, specific. Short sentences. Sound like a designer talking to another operator."
                    onChange={(event) => updateVoice(voice._key, 'guidance', event.currentTarget.value)}
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  <label style={styles.label}>
                    Do — one rule per line
                    <textarea
                      aria-label={`Do rules for ${voice.name || `voice ${index + 1}`}`}
                      style={{ ...styles.input, minHeight: 86 }}
                      value={(voice.do || []).join('\n')}
                      placeholder={'Lead with the useful point\nUse concrete verbs'}
                      onChange={(event) => updateVoice(voice._key, 'do', lines(event.currentTarget.value, 12))}
                    />
                  </label>
                  <label style={styles.label}>
                    Avoid — one rule per line
                    <textarea
                      aria-label={`Avoid rules for ${voice.name || `voice ${index + 1}`}`}
                      style={{ ...styles.input, minHeight: 86 }}
                      value={(voice.avoid || []).join('\n')}
                      placeholder={'No hype or fear-selling\nNo “just checking in”'}
                      onChange={(event) => updateVoice(voice._key, 'avoid', lines(event.currentTarget.value, 12))}
                    />
                  </label>
                </div>
                <label style={styles.label}>
                  Representative snippets — one short example per line (maximum 6)
                  <textarea
                    aria-label={`Representative snippets for ${voice.name || `voice ${index + 1}`}`}
                    style={{ ...styles.input, minHeight: 86 }}
                    value={(voice.examples || []).join('\n')}
                    placeholder="Choose a few publish-safe lines that demonstrate different voice principles."
                    onChange={(event) => updateVoice(voice._key, 'examples', lines(event.currentTarget.value, 6))}
                  />
                  <span style={{ ...styles.small, ...styles.muted, fontWeight: 400, lineHeight: 1.45 }}>
                    Favor a small, diverse set that shows different cadences, openings, and calls to action. Examples
                    demonstrate style only and never authorize their facts or claims.
                  </span>
                </label>
              </div>
            </details>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" style={styles.primaryButton} disabled={!dirty || saving || loading} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save brand voices'}
        </button>
        <button type="button" style={styles.button} disabled={!dirty || saving || loading} onClick={reset}>
          Discard edits
        </button>
        <button type="button" style={styles.button} disabled={dirty || saving || loading} onClick={() => void load()}>
          Reload saved voices
        </button>
      </div>
      {notice && <div role="status" style={{ ...styles.small, marginTop: 10 }}>{notice}</div>}
      {error && <div role="alert" style={{ ...styles.small, color: '#d98a8a', marginTop: 10 }}>{error}</div>}
    </div>
  )
}
