import { assertMarketingApiKey, assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { isPlainRecord, MarketingRequestError, readBoundedJson } from '@/lib/marketing/apiBoundary'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { intentProblems } from '@/lib/marketing/strategyIntent'
import { approveIntentAs, draftIntent, readIntent } from '@/lib/marketing/strategyIntent.server'
import { readTeamAccess } from '@/lib/marketing/teamAccess.server'

/**
 * The studio's intent, headless — the same core Slack uses.
 *
 *   GET  /api/marketing/strategy/intent                          → the intent, its problems, the authority setting
 *   POST { action: 'draft', by }                                  → a new DRAFT from the records
 *   POST { action: 'revise', by, instruction }                    → a new DRAFT with the change asked for
 *   POST { action: 'approve', by, version }                       → approve that version, if `by` may
 *
 * `by` is the person's board name. Approval is checked against the
 * Team permissions setting exactly as the Slack button is — and over HTTP it
 * needs the MARKETING_API_KEY, not just a Studio session: a Studio session
 * proves somebody is a writer, not that they are the `by` they typed, and the
 * setting exists precisely to limit WHO approves. In Slack the presser's
 * identity is verified, so the button needs no key.
 */
export const maxDuration = 120

const STATUS: Record<string, number> = {
  'not-configured': 503,
  'no-intent': 409,
  failed: 502,
  missing: 404,
  'not-allowed': 403,
  stale: 409,
  problems: 422,
  already: 409,
}

export async function GET(request: Request) {
  try {
    // A writer, not any project member: the intent is private (targets, the
    // runway it was written against) and is read with the server's write token.
    await assertStudioWriterOrApiKey(request)
    const [intent, teamAccess] = await Promise.all([readIntent(), readTeamAccess()])
    return privateMarketingJson({ intent, teamAccess, problems: intent ? intentProblems(intent, new Date()) : [] })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  try {
    await assertStudioWriterOrApiKey(request)
    const body = await readBoundedJson(request, 8_000)
    if (!isPlainRecord(body)) throw new MarketingRequestError('Request must be a JSON object.', 400)
    const by = typeof body.by === 'string' ? body.by.trim().slice(0, 80) : ''
    if (!by) throw new MarketingRequestError('Say who is asking: `by` is the person’s name.', 400)

    if (body.action === 'draft' || body.action === 'revise') {
      const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 1500) : ''
      if (body.action === 'revise' && !instruction) throw new MarketingRequestError('A revision needs an `instruction`.', 400)
      const result = await draftIntent({ by, instruction: body.action === 'revise' ? instruction : undefined })
      if (!result.ok) return privateMarketingJson({ error: result.message, reason: result.reason }, { status: STATUS[result.reason] || 400 })
      return privateMarketingJson({ intent: result.intent, problems: intentProblems(result.intent, new Date()) })
    }

    if (body.action === 'approve') {
      assertMarketingApiKey(request)
      const version = Number(body.version)
      if (!Number.isInteger(version) || version < 1) throw new MarketingRequestError('Say which `version` you are approving.', 400)
      const result = await approveIntentAs({ version, personName: by })
      if (!result.ok) {
        return privateMarketingJson({ error: result.message, reason: result.reason, intent: result.intent || null }, { status: STATUS[result.reason] || 400 })
      }
      return privateMarketingJson({ intent: result.intent })
    }

    throw new MarketingRequestError('`action` is one of draft, revise, approve.', 400)
  } catch (error) {
    return failure(error)
  }
}

function failure(error: unknown) {
  if (error instanceof MarketingAuthError) return privateMarketingJson({ error: error.message }, { status: error.status || 401 })
  if (error instanceof MarketingRequestError) return privateMarketingJson({ error: error.message }, { status: error.status })
  console.error('Strategy intent route failed.', error instanceof Error ? error.name : 'UnknownError')
  return privateMarketingJson({ error: 'The intent request failed.' }, { status: 500 })
}
