'use client'

import { useCallback, useEffect, useState } from 'react'
import { getGaIdentity } from '@/lib/analytics'

/**
 * Gift-first download capture: the file link works exactly like a normal
 * anchor — the download starts immediately, nothing is withheld or delayed —
 * and only AFTER the click does a quiet inline row appear offering revision
 * notices by email. Honesty rules (deliberate, keep them):
 *   - never a modal, never blocks or delays the download
 *   - ignoring the ask costs nothing and it never re-prompts after success
 *   - the promise is concrete ("one email when this changes"), not a
 *     newsletter opt-in in disguise
 * Submits to /api/newsletter/subscribe with a magnet slug so the Studio
 * dashboard attributes signups to this exact capture point.
 */

interface DownloadFollowUpProps {
  href: string
  label: React.ReactNode
  anchorClassName: string
  magnetSlug: string
  prompt: string
  finePrint: string
}

type FollowUpState = 'idle' | 'asking' | 'submitting' | 'done' | 'error'

const subscribedStorageKey = (slug: string) => `goinvo-followup-${slug}`

export function DownloadFollowUp({
  href,
  label,
  anchorClassName,
  magnetSlug,
  prompt,
  finePrint,
}: DownloadFollowUpProps) {
  const [state, setState] = useState<FollowUpState>('idle')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)

  useEffect(() => {
    try {
      setAlreadySubscribed(Boolean(window.localStorage.getItem(subscribedStorageKey(magnetSlug))))
    } catch {
      // Storage unavailable (private mode) — just allow the ask.
    }
  }, [magnetSlug])

  const handleDownloadClick = useCallback(() => {
    // Never preventDefault — the download proceeds untouched.
    if (!alreadySubscribed && state === 'idle') setState('asking')
  }, [alreadySubscribed, state])

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (state === 'submitting') return
      setState('submitting')
      try {
        const identity = getGaIdentity()
        const res = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            magnetSlug,
            sourcePath: window.location.pathname,
            website: honeypot,
            ...(identity.clientId ? { ga_client_id: identity.clientId } : {}),
            ...(identity.sessionId ? { ga_session_id: identity.sessionId } : {}),
          }),
        })
        const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
        if (res.ok && body?.ok) {
          setState('done')
          try {
            window.localStorage.setItem(subscribedStorageKey(magnetSlug), new Date().toISOString())
          } catch {
            // Best-effort only.
          }
        } else {
          setState('error')
        }
      } catch {
        setState('error')
      }
    },
    [email, honeypot, magnetSlug, state],
  )

  return (
    <div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={anchorClassName}
        onClick={handleDownloadClick}
      >
        {label}
      </a>

      {state !== 'idle' && (
        <div
          role="status"
          className="text--sm margin-bottom--half"
          style={{ lineHeight: 1.5 }}
          data-download-followup={magnetSlug}
        >
          {state === 'done' ? (
            <p className="text--gray" style={{ margin: '4px 0 0' }}>
              Done — we&apos;ll email you when it changes. Nothing else, promise.
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ margin: '4px 0 0' }}>
              <p className="text--gray" style={{ margin: '0 0 6px' }}>{prompt}</p>
              {/* Honeypot: invisible to people, filled by bots. */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address for revision notices"
                  disabled={state === 'submitting'}
                  style={{
                    flex: '1 1 220px',
                    maxWidth: 320,
                    padding: '8px 10px',
                    border: '1px solid #c9c4bc',
                    borderRadius: 2,
                    fontSize: 15,
                  }}
                />
                <button
                  type="submit"
                  className="button button--secondary"
                  disabled={state === 'submitting'}
                  aria-busy={state === 'submitting'}
                  style={{ padding: '8px 16px' }}
                >
                  {state === 'submitting' ? 'Sending…' : 'Notify me'}
                </button>
              </div>
              <p className="text--gray" style={{ margin: '6px 0 0', fontSize: 12 }}>
                {state === 'error'
                  ? 'That didn’t go through — mind trying again in a minute?'
                  : finePrint}
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
