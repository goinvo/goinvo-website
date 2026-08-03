import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SanityClient } from '@sanity/client'

import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import {
  LEAD_MAGNET_ATTRIBUTION_PREFIX,
  NEWSLETTER_ATTRIBUTION_CHANNEL,
  signupAttributionChannel,
} from '@/lib/marketing/leadMagnetSignup'
import { authenticatedMarketingRequest } from './authenticatedMarketingRequest'

// Shared `styles` + status palette stay owned by the marketing tool; imported
// back at runtime only, matching the other extracted panels' convention.
import { getStatusColor, styles, PanelHeading } from '../../tools/marketingTool'

// Dashboard panel: every lead magnet with its signup count, plus whether the
// EmailOctopus delivery is actually connected — so it is obvious when the
// signup form on the site would refuse (503) rather than capture. Counts come
// from the PRIVATE outreach dataset (signup contacts carry attributionChannel
// `lead-magnet:<slug>` / `newsletter`); the magnet registry is public data.
// Fail-soft: an error shows a muted line, never blocks the dashboard.

interface LeadMagnetRow {
  _id: string
  title?: string
  slug?: string
  status?: string
  emailOctopusTag?: string
  hasAsset?: boolean
}

interface LeadMagnetStatusResponse {
  emailOctopus: { connected: boolean; missingConfig: string[] }
}

export function LeadMagnetsPanel({ client }: { client: SanityClient }) {
  const [magnets, setMagnets] = useState<LeadMagnetRow[]>([])
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({})
  const [eoConnected, setEoConnected] = useState<boolean | null>(null)
  const [eoMissing, setEoMissing] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const outreachClient = useMemo(() => client.withConfig({ dataset: OUTREACH_DATASET }), [client])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fetchedMagnets, channels] = await Promise.all([
        client.fetch<LeadMagnetRow[]>(
          `*[_type == "marketingLeadMagnet" && !(_id in path("drafts.**"))] | order(title asc) {
            _id, title, "slug": slug.current, status, emailOctopusTag,
            "hasAsset": defined(gatedAsset.asset)
          }`,
        ),
        outreachClient.fetch<string[]>(
          `*[_type == "marketingContact" && defined(attributionChannel)
            && (attributionChannel == $newsletter || string::startsWith(attributionChannel, $prefix))
          ].attributionChannel`,
          { newsletter: NEWSLETTER_ATTRIBUTION_CHANNEL, prefix: LEAD_MAGNET_ATTRIBUTION_PREFIX },
        ),
      ])
      const counts: Record<string, number> = {}
      for (const channel of Array.isArray(channels) ? channels : []) {
        counts[channel] = (counts[channel] || 0) + 1
      }
      setMagnets(Array.isArray(fetchedMagnets) ? fetchedMagnets : [])
      setSignupCounts(counts)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load lead magnets.')
    } finally {
      setLoading(false)
    }

    // Connection status is separate + fail-soft: a status-route hiccup must not
    // blank the magnet list itself.
    try {
      const status = await authenticatedMarketingRequest<LeadMagnetStatusResponse>(
        `/api/marketing/lead-magnets/status?t=${Date.now()}`,
        undefined,
        'GET',
        outreachClient,
      )
      setEoConnected(status.emailOctopus?.connected === true)
      setEoMissing(status.emailOctopus?.missingConfig || [])
    } catch {
      setEoConnected(null)
    }
  }, [client, outreachClient])

  useEffect(() => {
    void load()
  }, [load])

  const okTone = getStatusColor('connected')
  const warnTone = getStatusColor('idea')
  const newsletterCount = signupCounts[NEWSLETTER_ATTRIBUTION_CHANNEL] || 0

  return (
    <section style={styles.panel} data-lead-magnets-panel="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <PanelHeading
          title="Lead magnets"
          description="Email capture through the first-party signup endpoint — signups land in EmailOctopus and (by default) as cold Outreach contacts."
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {eoConnected !== null && (
            <span
              title={eoConnected
                ? 'EmailOctopus is connected; the signup endpoint can deliver.'
                : `EmailOctopus not connected — the signup endpoint refuses (503). Missing: ${eoMissing.join(', ') || 'credentials'}.`}
              style={{
                border: `1px solid ${(eoConnected ? okTone : warnTone).border}`,
                background: (eoConnected ? okTone : warnTone).bg,
                color: (eoConnected ? okTone : warnTone).fg,
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              EmailOctopus {eoConnected ? '· Connected' : '· Not connected'}
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-busy={loading}
            style={{ ...styles.button, fontSize: 12, padding: '4px 10px' }}
          >
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" style={{ ...styles.small, ...styles.muted }}>{error}</div>
      ) : loading && magnets.length === 0 ? (
        <div style={{ ...styles.small, ...styles.muted }}>Loading lead magnets…</div>
      ) : (
        <>
          {magnets.length === 0 ? (
            <div style={{ ...styles.small, ...styles.muted }}>
              No lead magnets yet. Create a Lead Magnet document (title, slug, gated PDF, EmailOctopus tag) and set it Live to start capturing.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {magnets.map((magnet) => {
                const live = magnet.status === 'live'
                const tone = live ? okTone : warnTone
                const count = magnet.slug ? signupCounts[signupAttributionChannel(magnet.slug)] || 0 : 0
                return (
                  <div
                    key={magnet._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--card-border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                      <strong style={{ fontSize: 13 }}>{magnet.title || 'Untitled magnet'}</strong>
                      <span
                        style={{
                          border: `1px solid ${tone.border}`,
                          background: tone.bg,
                          color: tone.fg,
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {magnet.status || 'draft'}
                      </span>
                      {!magnet.slug && <span style={{ ...styles.small, ...styles.muted }}>no slug — endpoint can’t find it</span>}
                      {!magnet.hasAsset && <span style={{ ...styles.small, ...styles.muted }}>no gated PDF yet</span>}
                    </div>
                    <span style={{ ...styles.small }}>
                      <strong>{count}</strong> signup{count === 1 ? '' : 's'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ ...styles.small, ...styles.muted }}>
            Plain newsletter signups (no magnet): <strong>{newsletterCount}</strong>. Counts are Outreach contacts
            created by the signup endpoint — magnets with “Create Outreach Contacts” off only count in EmailOctopus.
          </div>
        </>
      )}
    </section>
  )
}
