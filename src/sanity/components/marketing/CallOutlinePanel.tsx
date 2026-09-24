import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SanityClient } from '@sanity/client'

import {
  composeCallOutline,
  type CallOutline,
  type PrepContact,
  type PrepEvidence,
  type PrepOffer,
  type PrepResearch,
} from '../../../lib/marketing/callPrep'
import { errorLine } from '../../../lib/marketing/marquetaStyle'
import { styles } from '../../tools/marketingTool'

/**
 * The call prep Slack posts, on the Outreach page.
 *
 * "Open Outreach" on a Slack prep, and Prep / Log it… on This week, all land
 * here. If the page then showed something different from the message the
 * person just read — another opener, other questions, a missing "if they
 * say…" — they would have two scripts for one call and no way to know which
 * one the team stands behind. So this does not write its own outline: it runs
 * the SAME pure composer Slack runs (`composeCallOutline`, no model, no
 * fetch of its own) over the SAME fields Slack reads (`CALL_OUTLINE_QUERY`,
 * pinned to Slack's `PREP_DATA_QUERY` in tests/outreach-landing.test.ts), and
 * renders what comes back in Slack's order: the four spoken lines first, the
 * reference material after.
 *
 * Everything here is client-safe on purpose — no `.server` module, no model
 * SDK — because it runs in the Studio bundle. The composer already keeps
 * unreviewed research out of the spoken lines; this only has to show its
 * "Background" under the same "not reviewed" label.
 *
 * One known difference from Slack: the outline is composed from the RECORD
 * (`request: null`). Slack also reads what the person typed, so "prep me for
 * my meeting with Jane tomorrow" is meeting prep there even when Jane's status
 * is not Meeting booked, while the Open Outreach link it carries names only
 * the contact and `prep` — so the Studio shows her record's mode (cold,
 * email-first, follow-up). Closing that gap needs a mode hint in the link and
 * the host; until then, marking the contact Meeting booked makes both agree.
 * Pinned in tests/outreach-landing.test.ts so nobody assumes full parity.
 */

type OutlineClient = Pick<SanityClient, 'fetch'>

/**
 * The records one outline reads: Slack's prep projections (PREP_DATA_QUERY in
 * callPrep.server.ts, which a Studio bundle cannot import), narrowed to one
 * contact. Same fields in, same composer, same words out — the parity test
 * fails the day the two read different fields.
 */
export const CALL_OUTLINE_QUERY = `{
  "contact": *[_type == "marketingContact" && _id == $id && !(_id in path("drafts.**"))][0]{
    _id, name, organization, role, segment, researchSuggestedSegment, warmth, status, owner, howWeKnow,
    email, phone, suggestedOpener, callBrief, researchReviewedAt, researchSummary, suggestedOfferKey,
    "relevantEvidence": relevantEvidence[]{ evidenceId, title, why },
    personVerified, identityConfidence, feasibilityScore,
    "channelOverrides": channelOverrides[]{ channel, state },
    lastContactedAt, followUpAt, nextStep,
    "interactions": interactions[-5..-1]{ _key, at, by, outcome, nextStep, statusAfter, channel }
  },
  "research": *[_type == "marketingOrgResearch" && verification.status == "verified" && !(_id in path("drafts.**"))]{
    organization, recentSignal, reachableAbout, suggestedOfferKey, context,
    verification{ status, evidence[]{ url, quote, textFragmentUrl } }
  },
  "offers": *[_type == "marketingOffer" && status == "active" && !(_id in path("drafts.**"))]{
    key, title, oneLiner, proofPoints, priceBand
  },
  "evidence": *[_type == "marketingWorkEvidence" && status == "active" && !(_id in path("drafts.**"))]{
    _id, title, client, businessOutcomes, "highlights": highlights[]{ metric, detail }
  }
}`

type OutlineData = {
  contact: PrepContact | null
  research: PrepResearch[]
  offers: PrepOffer[]
  evidence: PrepEvidence[]
}

/**
 * The name an outline speaks as — "it’s Shirley from GoInvo" — from the
 * Studio user's name: its first word, or '' when there is none. Slack does the
 * same with the presser's name. An empty name is left for the composer, which
 * writes "[your name]" rather than signing a draft as somebody else.
 */
export function studioSenderName(name: string | null | undefined): string {
  return String(name ?? '').trim().split(/\s+/)[0] || ''
}

/** The lead a non-default outline carries, as Slack's header names it. */
const MODE_LEAD: Partial<Record<CallOutline['mode'], string>> = {
  meeting: 'Meeting prep',
  emailFirst: 'Email first',
  holdOff: 'Hold off',
}

/** The cheat sheet's heading in each mode — Slack's words, so both say the same thing. */
function cheatSheetHeading(mode: CallOutline['mode']): string {
  if (mode === 'meeting') return 'In the meeting'
  if (mode === 'emailFirst') return 'If you end up talking'
  return 'On the call'
}

/** Only an http(s) source becomes a link: research URLs are record text, and a `javascript:` one must stay text. */
const safeHref = (value: string) => (/^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '')

const sectionTitle = { margin: 0, fontSize: 13, fontWeight: 850, letterSpacing: 0.2 } as const
const sectionBox = { display: 'grid', gap: 6 } as const
const draftText = {
  margin: 0,
  padding: 10,
  borderRadius: 6,
  background: 'rgba(0, 0, 0, 0.18)',
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
} as const

/**
 * The outline, drawn. Pure given its props (the copy status is its only
 * state), so tests render it with `renderToStaticMarkup` against the outline
 * Slack would post.
 *
 * Order follows Slack's prep, which follows the minute before a call: what to
 * say, then the one action (`actions`), then why now, the questions, the
 * answers to pushback, and last the drafts and the background nobody should
 * read out. Two modes reorder it, as Slack does:
 *
 * - `emailFirst` leads with the email, because today's job IS the email; the
 *   cheat sheet follows under "If you end up talking", and there is no
 *   voicemail script — nobody is being called yet.
 * - `holdOff` has no script at all. A script is an invitation to use it. It
 *   keeps its action row under "Don’t contact them", as Slack keeps its plain
 *   Log it…: someone we may not call can still call us, and that touch has to
 *   be logged somewhere. The caller decides the button is not green.
 *
 * Meeting mode has no "If they say…": those are cold-call objections, and a
 * booked meeting has already got past them.
 */
export function CallOutlineView({
  outline,
  actions,
}: {
  outline: CallOutline
  /** Rendered right under the thing to do now — the Document anatomy's action row. */
  actions?: ReactNode
}) {
  const [copyStatus, setCopyStatus] = useState('')
  // Built here, not at module scope: `styles` comes from the tool shell, which
  // imports this file, so it does not exist yet while this module loads.
  const copyButton = { ...styles.button, padding: '6px 10px', fontSize: 12, minHeight: 32, justifySelf: 'start' } as const

  const copy = (text: string, done: string) => {
    const failed = () => setCopyStatus('Couldn’t copy — select the text and copy it by hand.')
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      failed()
      return
    }
    void navigator.clipboard.writeText(text).then(() => setCopyStatus(done), failed)
  }

  const { mode, cheatSheet } = outline
  const lead = MODE_LEAD[mode]
  const cheatLines = (
    [
      ['Say', cheatSheet.say],
      ['Ask', cheatSheet.ask],
      ['If no', cheatSheet.ifNo],
      ['Exit', cheatSheet.exit],
    ] as const
  ).filter(([, line]) => String(line || '').trim())
  const sourceHref = outline.whyNow ? safeHref(outline.whyNow.sourceUrl) : ''

  const cheatSheetSection = cheatLines.length > 0 && (
    <div data-outline-section="cheatSheet" style={sectionBox}>
      <h4 style={sectionTitle}>{cheatSheetHeading(mode)}</h4>
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', gap: '6px 12px', margin: 0, fontSize: 14, lineHeight: 1.55 }}>
        {cheatLines.map(([label, line]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ fontWeight: 850 }}>{label}</dt>
            <dd style={{ margin: 0 }}>{line}</dd>
          </div>
        ))}
      </dl>
      {outline.askNote && (
        <p data-outline-section="askNote" style={{ ...styles.small, ...styles.muted, margin: 0 }}>
          <em>The ask — for you, not to read out:</em> {outline.askNote}
        </p>
      )}
    </div>
  )

  const actionRow = actions ? (
    <div data-outline-section="actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {actions}
    </div>
  ) : null

  const planSection = outline.plan && (
    <div data-outline-section="plan" style={sectionBox}>
      <h4 style={sectionTitle}>Plan</h4>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{outline.plan}</p>
    </div>
  )

  const emailBody = String(outline.email || '').trim()
  const emailSection = (open: boolean) =>
    emailBody && (
      <details data-outline-section="email" open={open}>
        <summary style={{ ...sectionTitle, cursor: 'pointer' }}>
          {mode === 'emailFirst' ? 'Today: send this email' : 'Email draft — edit before sending'}
        </summary>
        <div style={{ ...sectionBox, marginTop: 6 }}>
          <pre style={draftText}>{outline.email}</pre>
          <button
            type="button"
            aria-label="Copy the email draft"
            style={copyButton}
            onClick={() => copy(outline.email, 'Email draft copied — edit it before sending.')}
          >
            Copy
          </button>
        </div>
      </details>
    )

  return (
    <section
      aria-label={`Call outline for ${outline.personLabel}`}
      data-call-outline={mode}
      style={{
        display: 'grid',
        gap: 12,
        padding: 12,
        borderRadius: 7,
        border: '1px solid var(--card-border-color)',
        borderLeft: '3px solid #4fb3a5',
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        {lead && (
          <strong data-outline-section="mode" style={{ fontSize: 12, color: '#4fb3a5', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {lead}
          </strong>
        )}
        {outline.who && <span style={{ ...styles.small, ...styles.muted }}>{outline.who}</span>}
      </div>

      {outline.caveats.length > 0 && (
        <ul data-outline-section="caveats" style={{ ...styles.small, margin: 0, paddingLeft: 18, color: '#d6a93f' }}>
          {outline.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}

      {mode === 'holdOff' ? (
        <>
          <div data-outline-section="holdOff" style={sectionBox}>
            <h4 style={sectionTitle}>Don’t contact them</h4>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{outline.plan || 'They asked not to be called or emailed.'}</p>
          </div>
          {actionRow}
        </>
      ) : mode === 'emailFirst' ? (
        <>
          {emailSection(true)}
          {planSection}
          {actionRow}
          {cheatSheetSection}
        </>
      ) : (
        <>
          {cheatSheetSection}
          {actionRow}
          {planSection}
        </>
      )}

      {outline.agenda && outline.agenda.length > 0 && (
        <div data-outline-section="agenda" style={sectionBox}>
          <h4 style={sectionTitle}>Agenda (30 min)</h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55 }}>
            {outline.agenda.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {outline.whyNow && (
        <div data-outline-section="whyNow" style={sectionBox}>
          <h4 style={sectionTitle}>Why now</h4>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{outline.whyNow.signal}</p>
          <blockquote style={{ margin: 0, padding: '4px 0 4px 12px', borderLeft: '2px solid var(--card-border-color)', fontSize: 13 }}>
            “{outline.whyNow.quote}”
          </blockquote>
          {sourceHref && (
            <a href={sourceHref} target="_blank" rel="noreferrer" style={{ ...styles.inlineLink, fontSize: 12 }}>
              Source ↗
            </a>
          )}
        </div>
      )}

      {outline.questions.length > 0 && (
        <div data-outline-section="questions" style={sectionBox}>
          <h4 style={sectionTitle}>Questions</h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55 }}>
            {outline.questions.slice(0, 4).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      {mode !== 'meeting' && outline.ifTheySay.length > 0 && (
        <div data-outline-section="ifTheySay" style={sectionBox}>
          <h4 style={sectionTitle}>If they say…</h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55 }}>
            {outline.ifTheySay.slice(0, 8).map((line) => (
              <li key={line.theySay}>
                <em>{line.theySay}</em> → {line.youSay}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode !== 'emailFirst' && String(outline.voicemail || '').trim() && (
        <details data-outline-section="voicemail">
          <summary style={{ ...sectionTitle, cursor: 'pointer' }}>If it goes to voicemail (about 20 seconds)</summary>
          <div style={{ ...sectionBox, marginTop: 6 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{outline.voicemail}</p>
            <button
              type="button"
              aria-label="Copy the voicemail"
              style={copyButton}
              onClick={() => copy(outline.voicemail, 'Voicemail copied.')}
            >
              Copy
            </button>
          </div>
        </details>
      )}

      {mode !== 'emailFirst' && emailSection(false)}

      {outline.background.length > 0 && (
        <details data-outline-section="background">
          <summary style={{ ...sectionTitle, cursor: 'pointer', color: '#c08a6a' }}>Background — not reviewed</summary>
          <div style={{ ...sectionBox, marginTop: 6 }}>
            <p style={{ ...styles.small, ...styles.muted, margin: 0 }}>For you, not for the call — don’t repeat any of it as fact.</p>
            <ul style={{ ...styles.small, margin: 0, paddingLeft: 18 }}>
              {outline.background.slice(0, 6).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <span role="status" aria-live="polite" style={{ ...styles.small, ...styles.muted, minHeight: 1 }}>
        {copyStatus}
      </span>
    </section>
  )
}

/**
 * The outline for one contact, read and composed in the browser.
 *
 * Read again whenever the contact's revision moves — a log, an edit, an
 * approval all change what the outline should say ("last touch Thu 24 Sep").
 * The previous outline stays up while the new one loads, so saving a log does
 * not blank the panel the person was reading.
 */
export function CallOutlinePanel({
  client,
  contactId,
  revision,
  senderName,
  actions,
}: {
  /** Scoped to the private outreach dataset: that is where contacts and research live. */
  client: OutlineClient
  contactId: string
  /** The contact's `_rev`; when it changes the outline is read again. */
  revision?: string
  /** Who is making the call — see `studioSenderName`. */
  senderName: string
  /**
   * The action row, given the composed outline (email-first can preselect
   * "Sent an email"), or `null` when no outline could be drawn — a failed read,
   * or a contact the list no longer has. It is drawn then too, under the line
   * saying so: the panel's Log it… is its only one, and a read that failed is
   * no reason to leave somebody who just hung up with nowhere to log the call.
   * Not while the first read is in flight, so the button does not jump from
   * under a loading line to under the cheat sheet as the person reaches for it.
   */
  actions?: (outline: CallOutline | null) => ReactNode
}) {
  const [loaded, setLoaded] = useState<{ contactId: string; data: OutlineData; at: Date } | null>(null)
  const [failedFor, setFailedFor] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    client
      .fetch<Partial<OutlineData> | null>(CALL_OUTLINE_QUERY, { id: contactId })
      .then((data) => {
        if (cancelled) return
        setFailedFor(null)
        setLoaded({
          contactId,
          data: {
            contact: data?.contact && data.contact._id ? data.contact : null,
            research: (data?.research || []).filter((entry) => entry && entry.organization),
            offers: (data?.offers || []).filter(Boolean),
            evidence: (data?.evidence || []).filter((item) => item && item._id),
          },
          at: new Date(),
        })
      })
      .catch(() => {
        if (!cancelled) setFailedFor(contactId)
      })
    return () => {
      cancelled = true
    }
  }, [client, contactId, revision])

  const current = loaded && loaded.contactId === contactId ? loaded : null
  const outline = useMemo(() => {
    if (!current?.data.contact) return null
    return composeCallOutline({
      match: { kind: 'contact', contact: current.data.contact },
      research: current.data.research,
      offers: current.data.offers,
      evidence: current.data.evidence,
      senderName,
      // The Studio card already shows email and phone; the outline stays the
      // same shape Slack posts, which never carries them.
      includeContactDetails: false,
      now: current.at,
      // From the record only — the one known difference from Slack (module note).
      request: null,
    })
  }, [current, senderName])

  const withoutOutline = (line: ReactNode, role: 'alert' | 'status') => {
    const fallback = actions?.(null)
    return (
      <div data-call-outline-missing="true" style={{ display: 'grid', gap: 8 }}>
        <p role={role} style={{ ...styles.small, ...styles.muted, margin: 0 }}>
          {line}
        </p>
        {fallback ? (
          <div data-outline-section="actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fallback}
          </div>
        ) : null}
      </div>
    )
  }

  if (!current) {
    if (failedFor === contactId) {
      return withoutOutline(errorLine('load the call outline', 'The brief below has what’s on file.'), 'alert')
    }
    return (
      <p role="status" style={{ ...styles.small, ...styles.muted, margin: 0 }}>
        Putting the call outline together…
      </p>
    )
  }
  if (!outline) {
    return withoutOutline('This contact is no longer on the Outreach list, so there is no outline to show.', 'status')
  }
  return <CallOutlineView outline={outline} actions={actions?.(outline)} />
}
