import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient } from 'sanity'
import { useToast } from '@sanity/ui'

import { clientForType } from '../../../lib/marketing/datasetRouting'
import {
  buildOutreachCallSheet,
  draftOutreachNote,
  firstNameFor,
  type CallSheetEntry,
} from '../../../lib/marketing/callSheet'
import { styles } from '../../tools/marketingTool'

/**
 * "Do this now": the week's outreach, with everything needed to actually do it.
 *
 * The three things a person needs before making contact used to live in three
 * unconnected places — the task on the operations board, the reason to call in
 * the research records, and the people in the contact list. This puts them in
 * one card: who to write to, what changed at their organisation, the quote that
 * proves it, a link that highlights it in the source, and a draft note.
 *
 * Only VERIFIED research appears. A signal whose quote was not found in the page
 * it cites must never reach the screen where somebody picks up the phone.
 */

type Contact = {
  _id?: string
  name?: string | null
  role?: string | null
  organization?: string | null
  email?: string | null
  status?: string | null
}

const QUERY = `{
  "research": *[_type == "marketingOrgResearch" && verification.status == "verified"]{
    organization, recentSignal, reachableAbout, suggestedOfferKey, context,
    verification{ status, evidence[]{ url, quote, textFragmentUrl } }
  },
  "contacts": *[_type == "marketingContact" && defined(organization)]{
    _id, name, role, organization, email, status
  },
  "offers": *[_type == "marketingOffer" && status == "active"]{ key, title, oneLiner }
}`

export function OutreachCallSheet({ senderName = 'Juhan' }: { senderName?: string }) {
  const baseClient = useClient({ apiVersion: '2024-01-01' })
  // Research and contacts both live in the private dataset; a bare workspace
  // client would read production and quietly find nothing.
  const client = useMemo(() => clientForType(baseClient, 'marketingOrgResearch'), [baseClient])
  const toast = useToast()

  const [entries, setEntries] = useState<CallSheetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [openOrg, setOpenOrg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    client
      .fetch<{ research: never[]; contacts: Contact[]; offers: never[] }>(QUERY)
      .then((data) => {
        if (cancelled) return
        setEntries(
          buildOutreachCallSheet({
            research: data.research || [],
            contacts: data.contacts || [],
            offers: data.offers || [],
            limit: 5,
          }),
        )
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const copyNote = useCallback(
    async (entry: CallSheetEntry) => {
      const note = draftOutreachNote(entry, senderName)
      try {
        await navigator.clipboard.writeText(note)
        toast.push({ status: 'success', title: `Draft copied — edit it before sending` })
      } catch {
        toast.push({ status: 'warning', title: 'Could not copy. Select the text and copy manually.' })
      }
    },
    [senderName, toast],
  )

  if (loading) {
    return (
      <section style={styles.panel}>
        <h3 style={{ margin: 0 }}>Your outreach this week</h3>
        <p style={{ color: '#98a1b5', margin: '6px 0 0' }}>Loading…</p>
      </section>
    )
  }

  if (entries.length === 0) {
    return (
      <section style={styles.panel}>
        <h3 style={{ margin: '0 0 6px' }}>Your outreach this week</h3>
        <p style={{ color: '#98a1b5', margin: 0, maxWidth: '70ch' }}>
          Nothing verified to act on yet. Openings appear here once an organisation has research
          whose quote was found in the page it cites, and at least one contact who has not been
          contacted — deliberately, so nothing unverified is ever read out on a call.
        </p>
      </section>
    )
  }

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Your outreach this week</h3>
        <span style={{ fontSize: 12, color: '#98a1b5' }}>
          {entries.length} {entries.length === 1 ? 'organisation' : 'organisations'} · every signal
          checked against its source
        </span>
      </div>
      <p style={{ color: '#98a1b5', margin: '0 0 14px', fontSize: 13, maxWidth: '76ch' }}>
        Lead with what they are doing, not with us. Each draft is a starting point — read the
        source, then make it yours.
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {entries.map((entry) => {
          const open = openOrg === entry.organization
          return (
            <li
              key={entry.organization}
              style={{
                border: '1px solid rgba(255,255,255,.12)',
                borderLeft: '3px solid #4fb3a5',
                borderRadius: 4,
                padding: '12px 14px',
                background: 'rgba(255,255,255,.02)',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 15 }}>{entry.organization}</strong>
                <span style={{ fontSize: 12, color: '#98a1b5' }}>
                  {entry.contacts.length} {entry.contacts.length === 1 ? 'person' : 'people'}
                </span>
                {entry.offer?.title && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      color: '#4fb3a5',
                    }}
                  >
                    {entry.offer.title}
                  </span>
                )}
              </div>

              <p style={{ margin: '8px 0 4px', fontSize: 13.5 }}>
                <span style={{ color: '#98a1b5' }}>What changed: </span>
                {entry.signal}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#c9d1e0' }}>
                <span style={{ color: '#98a1b5' }}>Why they might want help: </span>
                {entry.opening}
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={styles.button} onClick={() => void copyNote(entry)}>
                  Copy draft note
                </button>
                <button
                  type="button"
                  style={{ ...styles.button, background: 'transparent' }}
                  onClick={() => setOpenOrg(open ? null : entry.organization)}
                >
                  {open ? 'Hide details' : 'Who, and the proof'}
                </button>
                {entry.sourceUrl && (
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: '#4fb3a5' }}
                  >
                    read the source ↗
                  </a>
                )}
              </div>

              {open && (
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: '#98a1b5' }}>
                      Who to write to
                    </div>
                    <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 3 }}>
                      {entry.contacts.map((contact) => {
                        const first = firstNameFor(contact)
                        return (
                          <li key={contact._id || contact.email} style={{ fontSize: 13 }}>
                            {first || contact.name || contact.email}
                            {contact.role && <span style={{ color: '#98a1b5' }}> · {contact.role}</span>}
                            {contact.email && (
                              <span style={{ color: '#6f7a90' }}> · {contact.email}</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: '#98a1b5' }}>
                      The exact words in the source
                    </div>
                    <blockquote
                      style={{
                        margin: '4px 0 0',
                        padding: '6px 0 6px 12px',
                        borderLeft: '2px solid rgba(255,255,255,.2)',
                        fontSize: 13,
                        color: '#c9d1e0',
                      }}
                    >
                      “{entry.quote}”
                    </blockquote>
                  </div>

                  {entry.context && (
                    <div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: '#c08a6a' }}>
                        Background — not verified, do not repeat as fact
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#98a1b5' }}>{entry.context}</p>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: '#98a1b5' }}>
                      Draft note
                    </div>
                    <pre
                      style={{
                        margin: '4px 0 0',
                        padding: 10,
                        background: 'rgba(0,0,0,.25)',
                        borderRadius: 4,
                        fontSize: 12.5,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        color: '#dbe2ee',
                      }}
                    >
                      {draftOutreachNote(entry, senderName)}
                    </pre>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
