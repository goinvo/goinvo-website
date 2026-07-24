import { createHmac, timingSafeEqual } from 'node:crypto'

export const MARKETING_PLAN_SESSION_COOKIE = 'goinvo_marketing_plan_session'
export const MARKETING_PLAN_SESSION_MAX_AGE = 8 * 60 * 60

function configuredKey(): string | null {
  const key = process.env.MARKETING_PLAN_KEY?.trim()
  return key || null
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function isMarketingPlanConfigured(): boolean {
  return configuredKey() !== null
}

export function verifyMarketingPlanKey(candidate: string): boolean {
  const key = configuredKey()
  return Boolean(key && candidate && safeEqual(candidate, key))
}

function sessionSignature(expiresAt: number, key: string): string {
  return createHmac('sha256', key)
    .update(`goinvo-marketing-plan-session-v1:${expiresAt}`)
    .digest('hex')
}

export function marketingPlanSessionValue(now = Date.now()): string | null {
  const key = configuredKey()
  if (!key) return null
  const expiresAt = Math.floor(now / 1000) + MARKETING_PLAN_SESSION_MAX_AGE
  return `${expiresAt}.${sessionSignature(expiresAt, key)}`
}

export function verifyMarketingPlanSession(candidate: string | undefined, now = Date.now()): boolean {
  const key = configuredKey()
  if (!key || !candidate) return false
  const [rawExpiry, signature, extra] = candidate.split('.')
  if (extra || !rawExpiry || !signature || !/^\d+$/.test(rawExpiry)) return false
  const expiresAt = Number(rawExpiry)
  const nowSeconds = Math.floor(now / 1000)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSeconds) return false
  // Reject tokens whose claimed life extends beyond what this server issues.
  if (expiresAt > nowSeconds + MARKETING_PLAN_SESSION_MAX_AGE) return false
  return safeEqual(signature, sessionSignature(expiresAt, key))
}
