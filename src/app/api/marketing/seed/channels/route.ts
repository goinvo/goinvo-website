import { NextResponse } from 'next/server'
import {
  assertStudioOrApiKey,
  DEFAULT_CHANNELS,
  ensureMarketingChannel,
  getMarketingWriteClient,
  MarketingAuthError,
} from '@/lib/marketing'

// POST /api/marketing/seed/channels
//
// Bootstraps a fresh site's marketing channels. Body: { keys?: string[] }.
// When `keys` is omitted, every DEFAULT_CHANNELS definition is ensured;
// otherwise only the requested keys (unknown keys are ignored). For each
// definition, ensureMarketingChannel creates the channel when missing or leaves
// the existing one untouched. Returns { created: string[], existing: string[] }
// of channel keys.
//
// Fails closed: a valid marketing API key OR a logged-in Studio session is
// required (401 otherwise).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    await assertStudioOrApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  // Body is optional; tolerate an empty/invalid body and fall back to all keys.
  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const requestedKeys = (body ?? {}) as { keys?: unknown }
  const keys =
    Array.isArray(requestedKeys.keys) && requestedKeys.keys.every((key) => typeof key === 'string')
      ? (requestedKeys.keys as string[])
      : undefined

  const definitions = keys
    ? DEFAULT_CHANNELS.filter((channel) => keys.includes(channel.key))
    : DEFAULT_CHANNELS

  try {
    const client = getMarketingWriteClient()
    const created: string[] = []
    const existing: string[] = []

    for (const definition of definitions) {
      const result = await ensureMarketingChannel(client, definition)
      if (result.created) {
        created.push(definition.key)
      } else {
        existing.push(definition.key)
      }
    }

    return NextResponse.json({ created, existing })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed channels.'
    console.error('Marketing seed channels failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
