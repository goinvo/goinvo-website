import { useCallback, useEffect, useState } from 'react'

// Shared `styles`, the status-color palette, and the Studio session-token helper
// remain owned by the marketing tool; imported back here at runtime only (inside
// the component body), matching the other extracted workspaces' circular-import
// convention.
import { getStatusColor, studioSessionToken, styles } from '../../tools/marketingTool'

// Surfaces whether the social auto-publishing channels are actually connected,
// so it is obvious when scheduled posts will NOT publish (credentials missing).
// Reads GET /api/marketing/publish/status as the logged-in Studio user (the
// route accepts the Sanity session token). Fail-soft: any error just shows a
// muted "couldn't check" line — it never blocks the calendar.

interface PlatformConnection {
  platform: string
  connected: boolean
  missingConfig: string[]
}

interface PublishStatusResponse {
  platforms: PlatformConnection[]
  dueCount: number | null
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
}

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] || platform
}

export function PublishConnectionStatus({ variant = 'banner' }: { variant?: 'banner' | 'compact' }) {
  const [status, setStatus] = useState<PublishStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = studioSessionToken()
      // Cache-buster: client fetches can be served from the browser cache even
      // with cache:'no-store', so each check (esp. Recheck) hits the server fresh.
      const res = await fetch(`/api/marketing/publish/status?t=${Date.now()}`, {
        headers: { ...(token ? { 'x-sanity-session': token } : {}) },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Status check failed (${res.status}).`)
      const json = (await res.json()) as PublishStatusResponse
      setStatus(json)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not check publishing connections.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const platforms = status?.platforms || []
  const total = platforms.length
  const connectedCount = platforms.filter((platform) => platform.connected).length
  const allConnected = total > 0 && connectedCount === total
  const noneConnected = total > 0 && connectedCount === 0

  // The compact (dashboard) variant is an attention item: render nothing while
  // loading, on error, or once everything is connected.
  if (variant === 'compact' && (loading || error || allConnected || total === 0)) {
    return null
  }

  const okTone = getStatusColor('connected') // green
  const warnTone = getStatusColor('idea') // amber — a setup step, not a failure
  const containerTone = allConnected ? okTone : warnTone

  let headline: string
  if (loading) headline = 'Checking social publishing connections…'
  else if (error) headline = "Couldn't check publishing connections."
  else if (allConnected) headline = 'Ready to auto-publish'
  else if (noneConnected) headline = "Not connected yet — scheduled posts won't publish"
  else headline = "Partially connected — some channels won't publish"

  const role = error ? 'alert' : 'status'

  const pills = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {platforms.map((platform) => {
        const tone = platform.connected ? okTone : warnTone
        const title = platform.connected
          ? `${platformLabel(platform.platform)} is connected.`
          : `${platformLabel(platform.platform)} not connected. Missing: ${platform.missingConfig.join(', ') || 'credentials'}.`
        return (
          <span
            key={platform.platform}
            title={title}
            style={{
              border: `1px solid ${tone.border}`,
              background: tone.bg,
              color: tone.fg,
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {platformLabel(platform.platform)} {platform.connected ? '· Connected' : '· Not connected'}
          </span>
        )
      })}
    </div>
  )

  return (
    <div
      role={role}
      data-publish-connection-status="true"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        margin: variant === 'compact' ? 0 : '0 0 12px',
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${error ? 'var(--card-border-color)' : containerTone.border}`,
        background: error ? 'transparent' : containerTone.bg,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13 }}>{headline}</strong>
          {!loading && !error && status?.dueCount ? (
            <span style={{ ...styles.small, ...styles.muted }}>
              {status.dueCount} scheduled and due now
            </span>
          ) : null}
        </div>
        {!loading && !error && !allConnected ? (
          <span style={{ ...styles.small, ...styles.muted }}>
            Posts set to auto-publish are saved on the calendar but won&rsquo;t post until this
            channel&rsquo;s LinkedIn or Instagram credentials are added. Ask an admin to set them up.
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {!loading && !error ? pills : null}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? 'Checking publishing connections' : 'Recheck publishing connections'}
          style={{ ...styles.button, fontSize: 12, padding: '4px 10px' }}
        >
          {loading ? 'Checking…' : 'Recheck'}
        </button>
      </div>
    </div>
  )
}
