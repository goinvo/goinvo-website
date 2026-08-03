import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { isAllowedChatRequest } from '@/lib/chat/config'
import { isLikelyBot } from '@/lib/marketing/botFilter'
import { getKvClient } from '@/lib/marketing/drainSink'
import { isRevisionConflict } from '@/lib/marketing/apiBoundary'
import { sendGa4MpEvents } from '@/lib/marketing/ga4MeasurementProtocol'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { normalizeOutreachEmail } from '@/lib/marketing/outreach'
import {
  emailOctopusMissingConfig,
  isEmailOctopusConfigured,
  sanitizeEmailOctopusTag,
  upsertEmailOctopusContact,
} from '@/lib/marketing/emailOctopus'
import {
  buildSignupContactRecords,
  sanitizeMagnetSlug,
  sanitizeSignupSourcePath,
  type LeadMagnetForSignup,
} from '@/lib/marketing/leadMagnetSignup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * First-party newsletter / lead-magnet signup.
 *
 * POST { email, magnetSlug?, sourcePath?, website? (honeypot), ga_client_id? }
 *  → 200 { ok: true, downloadUrl? }
 *
 * Replaces reliance on the third-party EmailOctopus embed script (blocked by
 * the ad/tracking blockers most of our audience runs — the same ~95% loss we
 * measured on client-side GA). The exchange: EmailOctopus owns the list, the
 * private outreach dataset gets a cold contact (per-magnet opt-out via
 * `createOutreachContacts`), GA4 gets a best-effort `newsletter_signup` event.
 *
 * Fail-closed on delivery: unconfigured (503) and EmailOctopus failures (502)
 * surface as errors — this route never pretends a lead was captured. The
 * contact-doc and GA4 steps are best-effort AFTER EmailOctopus has accepted
 * the address: at that point the lead is safe, so a CMS hiccup must not turn
 * a captured signup into a visitor-facing error.
 */

const MAX_BODY_BYTES = 16 * 1024
// Real visitors submit once; even a shared office NAT won't hit 10/min.
const RATE_LIMIT_PER_MINUTE = 10
const RL_PREFIX = 'marketing:newsletter:rl:'

const json = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status })

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || ''
  return request.headers.get('x-real-ip')?.trim() || ''
}

/**
 * Fail-open by design (deviation from the usual "writes fail closed" rule):
 * a limiter/KV hiccup dropping a REAL lead is strictly worse than letting a
 * burst through — the EmailOctopus upsert and deterministic contact ids are
 * idempotent, and the honeypot + origin check carry the spam load.
 */
async function isRateLimited(ip: string): Promise<boolean> {
  const kv = getKvClient()
  if (!kv || !ip) return false
  try {
    const bucket = Math.floor(Date.now() / 60000)
    const key = `${RL_PREFIX}${ip}:${bucket}`
    const count = await kv.incr(key)
    if (count === 1) await kv.expire(key, 120)
    return count > RATE_LIMIT_PER_MINUTE
  } catch {
    return false
  }
}

async function readBoundedJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const contentLength = Number(request.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null
    if (!request.body) return null
    const reader = request.body.getReader()
    const decoder = new TextDecoder()
    let bytes = 0
    let raw = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {})
        return null
      }
      raw += decoder.decode(value, { stream: true })
    }
    raw += decoder.decode()
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// The magnet registry lives in the world-readable production dataset; the
// contact PII goes ONLY to the private outreach dataset (never production).
let productionClient: SanityClient | null = null
function getProductionClient() {
  if (!productionClient) {
    productionClient = createClient({ projectId, dataset, apiVersion, useCdn: false })
  }
  return productionClient
}

let outreachClient: SanityClient | null = null
function getOutreachClient() {
  if (!writeToken) return null
  if (!outreachClient) {
    outreachClient = createClient({
      projectId,
      dataset: OUTREACH_DATASET,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return outreachClient
}

interface MagnetQueryResult extends LeadMagnetForSignup {
  status?: string
  downloadUrl?: string
}

/**
 * Best-effort after EmailOctopus accepted the lead. Never throws to the
 * visitor; an identity-claim conflict means the person is already a contact
 * (from any source — intake, an earlier signup) and is success, not failure.
 */
async function recordOutreachContact(
  email: string,
  magnet: MagnetQueryResult | null,
  sourcePath: string | undefined,
): Promise<void> {
  const client = getOutreachClient()
  if (!client) {
    console.error('Newsletter signup: SANITY write token missing — signup delivered to EmailOctopus but no outreach contact was recorded.')
    return
  }
  try {
    // Staff testing the form shouldn't enter the cold-outreach pool.
    const teamEmails = await getProductionClient().fetch<Array<string | null>>(
      `*[_type == "teamMember" && defined(social.email)].social.email`,
    )
    const normalizedTeam = new Set(
      (Array.isArray(teamEmails) ? teamEmails : [])
        .map((value) => normalizeOutreachEmail(value || undefined))
        .filter(Boolean),
    )
    if (normalizedTeam.has(email)) return

    const { contact, claims } = await buildSignupContactRecords(email, magnet, sourcePath)
    let transaction = client.transaction().create(contact)
    for (const claim of claims) transaction = transaction.create(claim)
    await transaction.commit()
  } catch (error) {
    if (isRevisionConflict(error)) return // already a contact — converged, done
    console.error('Newsletter signup: outreach contact could not be recorded (lead is safe in EmailOctopus):', error)
  }
}

export async function POST(request: NextRequest) {
  if (isLikelyBot(request.headers.get('user-agent'))) return json({ ok: true }, 200)
  if (!isAllowedChatRequest(request)) return json({ error: 'Origin not allowed.' }, 403)
  if (await isRateLimited(clientIp(request))) {
    return json({ error: 'Too many signups from this connection — try again in a minute.' }, 429)
  }

  const body = await readBoundedJson(request)
  if (!body) return json({ error: 'A JSON body with an `email` is required.' }, 400)

  // Honeypot: real visitors never fill the invisible `website` field. Answer
  // success so bots learn nothing, deliver nothing.
  if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true }, 200)

  const email = normalizeOutreachEmail(typeof body.email === 'string' ? body.email : undefined)
  if (!email) return json({ error: 'A valid email address is required.' }, 422)

  if (!isEmailOctopusConfigured()) {
    // Fail LOUD: a signup endpoint that swallows leads while unconfigured is
    // the worst failure mode this feature can have.
    console.error(`Newsletter signup refused: missing ${emailOctopusMissingConfig().join(', ')}.`)
    return json({ error: 'Signups are not configured yet. Please try again later.' }, 503)
  }

  const magnetSlug = sanitizeMagnetSlug(body.magnetSlug)
  let magnet: MagnetQueryResult | null = null
  if (magnetSlug) {
    magnet = await getProductionClient().fetch<MagnetQueryResult | null>(
      `*[_type == "marketingLeadMagnet" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
        title,
        status,
        offerKey,
        emailOctopusTag,
        createOutreachContacts,
        "slug": slug.current,
        "downloadUrl": gatedAsset.asset->url
      }`,
      { slug: magnetSlug },
    )
    if (!magnet) return json({ error: 'Unknown lead magnet.' }, 404)
    if (magnet.status !== 'live') return json({ error: 'This lead magnet is not accepting signups.' }, 409)
  }

  const sourcePath = sanitizeSignupSourcePath(body.sourcePath)
  const tag = sanitizeEmailOctopusTag(magnet?.emailOctopusTag)
    || (magnet?.slug ? `lead-magnet-${magnet.slug}` : 'newsletter')

  const delivery = await upsertEmailOctopusContact(email, [tag])
  if (!delivery.ok) {
    console.error('Newsletter signup: EmailOctopus rejected the signup:', delivery.error)
    return json({ error: 'Your signup could not be delivered. Please try again.' }, 502)
  }

  // Lead is safe from here — everything below is best-effort.
  const shouldRecordContact = magnet ? magnet.createOutreachContacts !== false : true
  if (shouldRecordContact) await recordOutreachContact(email, magnet, sourcePath)

  const gaClientId = String(body.ga_client_id ?? '').trim().slice(0, 128)
  const gaSessionId = String(body.ga_session_id ?? '').trim().slice(0, 128)
  if (gaClientId) {
    await sendGa4MpEvents(gaClientId, [
      {
        name: 'newsletter_signup',
        params: {
          magnet: magnet?.slug || 'newsletter',
          ...(sourcePath ? { source_path: sourcePath } : {}),
          ...(gaSessionId ? { session_id: gaSessionId } : {}),
        },
      },
    ])
  }

  return json({ ok: true, ...(magnet?.downloadUrl ? { downloadUrl: magnet.downloadUrl } : {}) }, 200)
}
