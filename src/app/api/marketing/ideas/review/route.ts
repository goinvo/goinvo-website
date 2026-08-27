import type { NextRequest } from 'next/server'
import { assertStudioWriterOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { discardIdeaById, ideasNeedingReview, keepIdeaById } from '@/lib/marketing/ideaCapture.server'

/**
 * Judging the ideas Marqueta caught in Slack.
 *
 *   GET                             what is still waiting on a person
 *   POST { id, keep: true|false }   keep it, or say it was never an idea
 *
 * The same judgement is available in the Slack thread where the message was
 * caught. This exists because a thread is easy to miss, and an idea nobody ever
 * judged is worse than one nobody captured — it sits on the board looking like
 * a decision somebody made.
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
  const pending = await ideasNeedingReview(20)
  return privateMarketingJson({ pending })
}

export async function POST(request: NextRequest) {
  const denied = await guard(request)
  if (denied) return denied

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const id = String(body.id || '').trim()
  const personName = String(body.personName || 'Someone')
  if (!id) return privateMarketingJson({ error: 'Which idea?' }, { status: 400 })

  // Explicitly boolean: a missing `keep` must not default to keeping, which
  // would silently bless a guess nobody actually looked at.
  if (typeof body.keep !== 'boolean') {
    return privateMarketingJson({ error: 'Say whether to keep it.' }, { status: 400 })
  }

  const result = body.keep ? await keepIdeaById(id, personName) : await discardIdeaById(id, personName)
  return privateMarketingJson(result, { status: result.ok ? 200 : 404 })
}
