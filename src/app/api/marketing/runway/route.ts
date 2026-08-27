import type { NextRequest } from 'next/server'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { confirmRunway, readRunway, recordSignedWork, setRunway } from '@/lib/marketing/runway.server'

/**
 * Telling Marqueta about the money.
 *
 *   GET                          what the runway is, and whether it needs asking about
 *   POST { action: 'confirm' }   still right, no numbers changed
 *   POST { action: 'set', months | certainUntil, basis }
 *   POST { action: 'signed', label, monthsAdded, note }
 *
 * Always a private response: this says in plain numbers how close the studio is
 * to running out of money, so it must never be cached by anything in front of
 * the app, and it is gated exactly like the rest of the private marketing API.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function guard(request: NextRequest) {
  try {
    await assertStudioWriterOrApiKey(request)
    return null
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const denied = await guard(request)
  if (denied) return denied

  const state = await readRunway()
  return privateMarketingJson(state)
}

export async function POST(request: NextRequest) {
  const denied = await guard(request)
  if (denied) return denied

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const action = String(body.action || '').trim()
  const personName = body.personName ? String(body.personName) : undefined

  try {
    if (action === 'confirm') {
      return privateMarketingJson(await confirmRunway({ personName }))
    }

    if (action === 'set') {
      const months = body.months === undefined ? undefined : Number(body.months)
      const certainUntil = body.certainUntil ? String(body.certainUntil) : undefined
      if (months !== undefined && (!Number.isFinite(months) || months < 0)) {
        return privateMarketingJson({ error: 'months must be a number of months, not negative.' }, { status: 400 })
      }
      return privateMarketingJson(
        await setRunway({ months, certainUntil, basis: body.basis ? String(body.basis) : undefined, personName }),
      )
    }

    if (action === 'signed') {
      const label = String(body.label || '').trim()
      const monthsAdded = Number(body.monthsAdded)
      if (!label) {
        return privateMarketingJson({ error: 'Say what was signed.' }, { status: 400 })
      }
      // A commitment with no months is not refused — but it cannot move the
      // date, and pretending otherwise would inflate the runway on a guess.
      if (!Number.isFinite(monthsAdded) || monthsAdded <= 0) {
        return privateMarketingJson(
          { error: 'How many months of runway does it buy? Without that it cannot move the date.' },
          { status: 400 },
        )
      }
      return privateMarketingJson(
        await recordSignedWork({ label, monthsAdded, note: body.note ? String(body.note) : undefined, personName }),
      )
    }

    return privateMarketingJson(
      { error: 'Unknown action.', actions: ['confirm', 'set', 'signed'] },
      { status: 400 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'That did not save.'
    return privateMarketingJson({ error: message }, { status: 400 })
  }
}
