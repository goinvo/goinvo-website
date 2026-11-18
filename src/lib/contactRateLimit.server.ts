import 'server-only'
import { getKvClient } from '@/lib/marketing/drainSink'

/**
 * Limits on the contact form. A person sends one note, perhaps a correction; a script sends
 * hundreds. Counted in KV so it holds across serverless instances.
 *
 * - per address: 3 notes in ten minutes, 10 in a day. Over that the route answers "not sent"
 *   and the page shows the JotForm itself, filled in, so a real person is never stuck.
 * - the Slack post: 12 an hour across everyone, so a flood from many addresses cannot fill
 *   the channel. Notes over that are still in the JotForm inbox.
 *
 * Fail-open, like the newsletter route: without KV, or when it errors, nothing is limited.
 * Losing a real enquiry to a counter fault is worse than letting a burst through.
 */
export const CONTACT_RATE = { perTenMinutes: 3, perDay: 10, slackPerHour: 12 }
const PREFIX = 'contact:rl:'

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || ''
  return request.headers.get('x-real-ip')?.trim() || ''
}

async function count(key: string, seconds: number): Promise<number> {
  const kv = getKvClient()
  if (!kv) return 0
  try {
    const value = await kv.incr(key)
    if (value === 1) await kv.expire(key, seconds)
    return value
  } catch {
    return 0
  }
}

/** True when this address has sent more than a person would. Counts the attempt. */
export async function contactOverLimit(ip: string, now = Date.now()): Promise<boolean> {
  if (!ip) return false
  const [short, day] = await Promise.all([
    count(`${PREFIX}${ip}:m${Math.floor(now / 600000)}`, 1200),
    count(`${PREFIX}${ip}:d${Math.floor(now / 86400000)}`, 172800),
  ])
  return short > CONTACT_RATE.perTenMinutes || day > CONTACT_RATE.perDay
}

/** True when Slack has had its share of notes for this hour. Counts the post. */
export async function slackPostsOverLimit(now = Date.now()): Promise<boolean> {
  return (await count(`${PREFIX}slack:h${Math.floor(now / 3600000)}`, 7200)) > CONTACT_RATE.slackPerHour
}
