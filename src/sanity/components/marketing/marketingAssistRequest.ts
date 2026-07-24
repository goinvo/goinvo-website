import { studioSessionHeader } from '@/sanity/lib/studioSession'

type MarketingAssistPayload = {
  error?: string
}

/**
 * Send a Studio-authenticated request to the shared marketing assistant.
 * Keeping this boundary in one place prevents individual workspaces from
 * accidentally dropping the Studio session header or treating a 401 as a
 * successful rule-based draft.
 */
export async function requestMarketingAssist<T extends MarketingAssistPayload>(
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch('/api/marketing/assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...studioSessionHeader() },
    body: JSON.stringify(body),
  })

  let payload: T
  try {
    payload = (await response.json()) as T
  } catch {
    throw new Error(
      response.ok
        ? 'Marketing assistant returned an unreadable response.'
        : `Marketing assistant request failed (${response.status}).`,
    )
  }

  if (!response.ok) {
    throw new Error(payload.error || `Marketing assistant request failed (${response.status}).`)
  }

  return payload
}
