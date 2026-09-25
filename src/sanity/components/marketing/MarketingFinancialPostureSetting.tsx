import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient, useCurrentUser } from 'sanity'

import {
  FINANCIAL_POSTURES,
  DEFAULT_FINANCIAL_POSTURE_ID,
  FINANCIAL_POSTURE_DOC_ID,
  FINANCIAL_POSTURE_DOC_TYPE,
  getFinancialPosture,
  type FinancialPostureId,
} from '../../../lib/marketing/financialPosture'
import { errorLine, LABEL } from '../../../lib/marketing/marquetaStyle'
import { OUTREACH_DATASET } from '../../../lib/marketing/outreachEnums'
import {
  describeRunway,
  resolveRunwayPosture,
  runwayCheckIn,
  type ResolvedRunway,
  type RunwayCheckIn,
  type StoredPosture,
} from '../../../lib/marketing/runway'
import { Select, styles } from '../../tools/marketingTool'
import { authenticatedMarketingRequest } from './authenticatedMarketingRequest'

/**
 * Money and direction: the runway the whole strategy is derived from, asked
 * about the way Slack asks about it.
 *
 * The runway is a DATE (`certainUntil`), and the posture bin is computed from
 * it — see runway.ts. The Studio used to show only the bin, and its "Still
 * right" re-stamped the bin's `setAt`. Because a newer hand-set bin beats the
 * runway (`resolveRunwayPosture` lets recency decide), pressing it here after
 * the team had just confirmed the runway in Slack quietly put the stale bin
 * back in charge of the plan. So now:
 *
 *   - the runway comes first, in the same words Slack uses (`describeRunway`,
 *     then the check-in's reason and question, then any disagreement);
 *   - `Still right`, `We signed something…` and `It changed…` go through
 *     /api/marketing/runway — the same writes as the Slack buttons and modal;
 *   - the nudge never writes `setAt`. Setting a posture by hand is still
 *     possible, but it is an explicit OVERRIDE behind a disclosure that says
 *     what it does, because that is what it is.
 *
 * `compact` renders the Dashboard nudge (only when a check-in is due, or the
 * two inputs disagree); the full variant is the Settings section.
 *
 * The runway API is for people who can write. Somebody who can only read (or
 * a Studio whose server has no write token) still sees the runway — read
 * straight from the dataset with the Studio's own client, as this component
 * always did, and described with the same pure functions the API uses — but
 * is offered nothing to press, and is not nagged on the Dashboard about a
 * question they cannot answer.
 *
 * Storage is the PRIVATE outreach dataset: this is candid feasibility data
 * and the production dataset is world-readable.
 */

type RunwayState = {
  stored: StoredPosture
  resolved: ResolvedRunway
  checkIn: RunwayCheckIn
  summary: string
}

type RunwayForm = 'signed' | 'changed'

/**
 * Months as people type them — "4.5", "about 4.5", "4,5 months" — or null.
 * The minus is checked before anything is stripped: "-2" means two months
 * PAST the end, and stripping it would have extended the runway by two. The
 * Slack modal reads its field the same way.
 */
export function parseRunwayMonths(raw: string): number | null {
  const value = String(raw ?? '').trim()
  if (!value || /-\s*[0-9]/.test(value)) return null
  const parsed = Number(value.replace(',', '.').replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * The body each answer posts to /api/marketing/runway — or null when a form is
 * not filled in enough to say anything. None of them carries `posture` or
 * `setAt`: an answer about the runway is a runway write, never a new bin.
 */
export function runwayAnswerBody(
  answer: 'confirm' | RunwayForm,
  fields: { label?: string; months?: string; basis?: string } = {},
  personName?: string,
): Record<string, unknown> | null {
  const who = String(personName ?? '').trim()
  const signedBy = who ? { personName: who } : {}
  if (answer === 'confirm') return { action: 'confirm', ...signedBy }
  const months = parseRunwayMonths(fields.months || '')
  if (months === null) return null
  if (answer === 'signed') {
    const label = String(fields.label ?? '').replace(/\s+/g, ' ').trim()
    if (!label) return null
    return { action: 'signed', label, monthsAdded: months, ...signedBy }
  }
  const basis = String(fields.basis ?? '').trim()
  return { action: 'set', months, ...(basis ? { basis } : {}), ...signedBy }
}

/**
 * Whether the Dashboard should ask: a check-in is due, or the date and the bin
 * disagree WHILE the hand-set bin is the one the plan follows.
 *
 * Once the runway is confirmed later than the bin was set, the runway wins on
 * its own and the stale bin only ever loses. Nagging about it then left a card
 * none of its answers could clear: "Still right" re-confirmed the runway and
 * the disagreement stayed, on every visit, until the months happened to cross
 * a bin boundary — and the one way out, the Override select, writes `setAt`
 * and hands the plan back to the stale bin. Slack asks the same way
 * (`buildMoneyAndDirectionBlocks`).
 */
export function moneyNudgeDue(state: Pick<RunwayState, 'checkIn' | 'resolved'> | null): boolean {
  return Boolean(state && (state.checkIn?.due || (state.resolved?.disagreement && state.resolved?.source === 'manual')))
}

/**
 * The "Override the runway" select: its value and its options.
 *
 * It shows a posture only while that override is the one the plan follows.
 * Bound to the stored bin, it showed "Survival" selected directly above "The
 * plan is following the runway date right now" — a posture not in effect —
 * and since a native select fires no change for the option already selected,
 * that one posture (the one the disagreement line names, and so the one
 * somebody who knows the money is worse would reach for) could not be picked
 * at all. The placeholder is always there, so every choice is a change.
 */
export function postureOverrideSelect(state: Pick<RunwayState, 'stored' | 'resolved'> | null): {
  value: string
  options: Array<{ title: string; value: string }>
} {
  const stored = getFinancialPosture(state?.stored?.posture)
  return {
    value: state?.resolved?.source === 'manual' && stored ? stored.id : '',
    options: [
      { title: 'Choose a posture…', value: '' },
      ...FINANCIAL_POSTURES.map((p) => ({ title: `${p.title} — ${p.runwayLabel}`, value: p.id })),
    ],
  }
}

/**
 * The runway as the API describes it, from the stored record — for the
 * read-only fallback. The API's own `readRunway` is these same three calls.
 */
export function runwayStateFrom(stored: StoredPosture | null | undefined, now: Date = new Date()): RunwayState {
  const record = stored || {}
  return {
    stored: record,
    resolved: resolveRunwayPosture(record, now),
    checkIn: runwayCheckIn(record, now),
    summary: describeRunway(record, now),
  }
}

/**
 * The answers worth offering. With no runway recorded there is nothing for
 * "Still right" to confirm — pressing it stamped a confirmation on an empty
 * record and the question never went away — and nothing for signed work to
 * extend, so the only answer is the number itself: "It changed…".
 */
export function runwayAnswersOffered(state: Pick<RunwayState, 'resolved'> | null): Array<'confirm' | RunwayForm> {
  if (!state) return []
  if (state.resolved?.months === null || state.resolved?.months === undefined) return ['changed']
  return ['confirm', 'signed', 'changed']
}

const firstName = (name: unknown) => String(name ?? '').trim().split(/\s+/)[0] || ''

export function MarketingFinancialPostureSetting({
  compact = false,
  onOpenSettings,
  onPostureChange,
}: {
  compact?: boolean
  onOpenSettings?: () => void
  onPostureChange?: (posture: FinancialPostureId) => void
}) {
  const baseClient = useClient({ apiVersion: '2024-01-01' })
  const postureClient = useMemo(() => baseClient.withConfig({ dataset: OUTREACH_DATASET }), [baseClient])
  const personName = firstName(useCurrentUser()?.name)

  const [state, setState] = useState<RunwayState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Read without the API (see the header): shown, but nothing to press.
  const [readOnly, setReadOnly] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<RunwayForm | null>(null)
  const [fields, setFields] = useState({ label: '', months: '', basis: '' })

  const adopt = useCallback(
    (next: RunwayState) => {
      setState(next)
      // The resolved posture, not the stored bin: it is what the plan uses.
      onPostureChange?.(next.resolved?.id || DEFAULT_FINANCIAL_POSTURE_ID)
    },
    [onPostureChange],
  )

  useEffect(() => {
    let active = true
    setLoaded(false)
    setLoadError(null)
    setReadOnly(false)
    authenticatedMarketingRequest<RunwayState>('/api/marketing/runway', undefined, 'GET', postureClient)
      .then((value) => {
        if (!active) return
        adopt(value)
        setLoaded(true)
      })
      .catch(async () => {
        // Not allowed to write, or the server cannot: read it the old way.
        try {
          const stored = await postureClient.fetch<StoredPosture | null>(`*[_id == $id][0]{ posture, setAt, runway }`, {
            id: FINANCIAL_POSTURE_DOC_ID,
          })
          if (!active) return
          adopt(runwayStateFrom(stored))
          setReadOnly(true)
        } catch {
          if (!active) return
          setLoadError(errorLine('load the runway', 'Retry before changing anything, so a saved value is not overwritten.'))
        }
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [adopt, postureClient, reloadKey])

  /** Still right / We signed something… / It changed… — the Slack buttons' own writes. */
  const answer = useCallback(
    async (kind: 'confirm' | RunwayForm) => {
      const body = runwayAnswerBody(kind, fields, personName)
      if (!body) {
        setSaveError(
          kind === 'signed'
            ? 'Say what was signed and how many months it buys.'
            : 'How many months of runway are left? Half months are fine.',
        )
        return
      }
      setSaving(true)
      setSaveError(null)
      setNotice('')
      try {
        const next = await authenticatedMarketingRequest<RunwayState>('/api/marketing/runway', body, 'POST', postureClient)
        adopt(next)
        setForm(null)
        setFields({ label: '', months: '', basis: '' })
        setNotice(kind === 'confirm' ? 'Confirmed — the plan follows the runway.' : 'Saved — the plan follows the new date.')
      } catch (error) {
        // A silent optimistic "success" would read as confirmed while nothing
        // was written — say so instead.
        setSaveError(errorLine('save that', error instanceof Error ? error.message : 'Check your access and try again.'))
      } finally {
        setSaving(false)
      }
    },
    [adopt, fields, personName, postureClient],
  )

  /**
   * The explicit override: a posture set by hand, stamped `setAt`, which the
   * plan follows until somebody next confirms the runway. The ONLY write of
   * `setAt` in this component — see the header for why the nudge never does.
   */
  const saveOverride = useCallback(
    async (value: FinancialPostureId) => {
      setSaving(true)
      setSaveError(null)
      setNotice('')
      try {
        await postureClient
          .transaction()
          .createIfNotExists({ _id: FINANCIAL_POSTURE_DOC_ID, _type: FINANCIAL_POSTURE_DOC_TYPE })
          .patch(FINANCIAL_POSTURE_DOC_ID, (p) => p.set({ posture: value, setAt: new Date().toISOString() }))
          .commit()
        setNotice('Override saved — the plan follows it until the runway is confirmed again.')
        setReloadKey((key) => key + 1)
      } catch {
        setSaveError(errorLine('save the override', 'Check your access and try again.'))
      } finally {
        setSaving(false)
      }
    },
    [postureClient],
  )

  const posture = getFinancialPosture(state?.resolved?.id)
  const overriding = state?.resolved?.source === 'manual'
  const overrideSelect = postureOverrideSelect(state)
  const due = moneyNudgeDue(state)

  // The Dashboard only asks somebody who can answer: nothing while loading,
  // nothing for a reader who cannot write, and no red error on every visit
  // when the runway cannot be read at all (Settings still shows it, with Retry).
  if (compact && (!loaded || readOnly || loadError || (!due && !saveError && !notice))) return null
  const offered: Array<'confirm' | RunwayForm> = readOnly ? [] : runwayAnswersOffered(state)

  const openForm = (next: RunwayForm) => {
    setSaveError(null)
    setNotice('')
    setForm((current) => (current === next ? null : next))
  }

  const summary = (
    <div style={{ ...styles.small, lineHeight: 1.5, display: 'grid', gap: 4 }}>
      {state && <div><strong>{state.summary}</strong></div>}
      {state?.checkIn?.due && (
        <div>
          {state.checkIn.reason} {state.checkIn.question}
        </div>
      )}
      {state?.resolved?.disagreement && <div><em>{state.resolved.disagreement}</em></div>}
      {notice && <div role="status" style={{ color: '#7dd69e' }}>{notice}</div>}
      {saveError && <div role="alert" style={{ color: '#d98a8a' }}>{saveError}</div>}
      {loadError && <div role="alert" style={{ color: '#d98a8a' }}>{loadError}</div>}
      {readOnly && <div style={styles.muted}>Read-only here — changing the runway needs an editor.</div>}
    </div>
  )

  // None of the three is styled primary, as in Slack: confirming a number is
  // the cheap answer, and a bright button invites a reflex press on the one
  // number the whole strategy hangs on.
  const buttons = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {offered.includes('confirm') && (
        <button type="button" style={{ ...styles.button, minHeight: 44 }} disabled={saving} onClick={() => void answer('confirm')}>
          {saving && !form ? 'Saving…' : LABEL.RUNWAY_OK}
        </button>
      )}
      {offered.includes('signed') && (
        <button
          type="button"
          style={{ ...styles.button, minHeight: 44 }}
          disabled={saving}
          aria-expanded={form === 'signed'}
          onClick={() => openForm('signed')}
        >
          {LABEL.RUNWAY_SIGNED}
        </button>
      )}
      {offered.includes('changed') && (
        <button
          type="button"
          style={{ ...styles.button, minHeight: 44 }}
          disabled={saving}
          aria-expanded={form === 'changed'}
          onClick={() => openForm('changed')}
        >
          {LABEL.RUNWAY_CHANGED}
        </button>
      )}
      {(loadError || readOnly) && (
        <button type="button" style={{ ...styles.button, minHeight: 44 }} onClick={() => setReloadKey((value) => value + 1)}>
          Retry load
        </button>
      )}
      {compact && onOpenSettings && (
        <button type="button" style={{ ...styles.button, minHeight: 44 }} onClick={onOpenSettings}>
          Open Settings
        </button>
      )}
    </div>
  )

  // The Slack modal's fields, in the same words, so an answer given here and
  // one given in Slack are the same write.
  const runwayForm = form && !readOnly && (
    <form
      aria-label={form === 'signed' ? 'Signed work' : 'Update runway'}
      style={{ display: 'grid', gap: 10, marginTop: 10, maxWidth: 520 }}
      onSubmit={(event) => {
        event.preventDefault()
        void answer(form)
      }}
    >
      {form === 'signed' && (
        <label style={styles.label}>
          What was signed
          <input
            style={{ ...styles.input, marginTop: 4, fontSize: 16 }}
            value={fields.label}
            placeholder="SoW — Acme, discovery phase"
            onChange={(event) => {
              const value = event.currentTarget.value
              setFields((current) => ({ ...current, label: value }))
            }}
          />
        </label>
      )}
      <label style={styles.label}>
        {form === 'signed' ? 'Months of runway it buys' : 'Months of runway left'}
        <input
          style={{ ...styles.input, marginTop: 4, fontSize: 16 }}
          inputMode="decimal"
          value={fields.months}
          placeholder={form === 'signed' ? '3' : '4.5'}
          onChange={(event) => {
            const value = event.currentTarget.value
            setFields((current) => ({ ...current, months: value }))
          }}
        />
        <span style={{ ...styles.small, ...styles.muted, fontWeight: 400 }}>
          {form === 'signed'
            ? 'Added to the runway we already had, not counted from today.'
            : 'Assuming nothing new closes. Half months are fine.'}
        </span>
      </label>
      {form === 'changed' && (
        <label style={styles.label}>
          What that assumes (optional)
          <textarea
            rows={2}
            style={{ ...styles.input, marginTop: 4, fontSize: 16, resize: 'vertical' }}
            value={fields.basis}
            placeholder="Signed work in hand, nothing new closing."
            onChange={(event) => {
              const value = event.currentTarget.value
              setFields((current) => ({ ...current, basis: value }))
            }}
          />
        </label>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" style={{ ...styles.primaryButton, minHeight: 44 }} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" style={{ ...styles.button, minHeight: 44 }} disabled={saving} onClick={() => setForm(null)}>
          Cancel
        </button>
      </div>
    </form>
  )

  if (compact) {
    return (
      <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, borderColor: 'rgba(214, 169, 63, 0.5)', marginBottom: 12 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ ...styles.small, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Money and direction
          </div>
          {summary}
          {buttons}
          {runwayForm}
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 18 }}>Money and direction{saving ? ' · saving…' : ''}</h2>
          <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.5 }}>
            The runway picks the strategy the suite recommends. Short runway: only fast-closing work (reaching out to
            people who know us) pays in time. Longer runway: content, SEO and brand earn their keep. Stored in the
            private dataset, never on the public site.
          </div>
        </div>
        {!loaded ? <div style={{ ...styles.small, ...styles.muted }}>Reading the runway…</div> : summary}
        {posture && <div style={{ ...styles.small, lineHeight: 1.5 }}>{posture.strategy}</div>}
        {buttons}
        {runwayForm}
        <details>
          <summary style={{ ...styles.small, minHeight: 44, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            Override the runway (the plan follows this until the runway is confirmed again)
          </summary>
          <div style={{ display: 'grid', gap: 6, marginTop: 8, maxWidth: 420 }}>
            <Select
              ariaLabel="Financial posture"
              value={overrideSelect.value}
              options={overrideSelect.options}
              disabled={!loaded || saving || Boolean(loadError) || readOnly}
              onChange={(value) => {
                const found = getFinancialPosture(value)
                if (found) void saveOverride(found.id)
              }}
            />
            <div style={{ ...styles.small, ...styles.muted }}>
              {overriding
                ? 'The plan is following this setting right now, not the runway date.'
                : 'The plan is following the runway date right now.'}
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
