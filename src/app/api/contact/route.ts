/**
 * POST /api/contact: send the contact form's name, email and note to the site's JotForm.
 * Answers { sent: true } only when JotForm accepted it (src/lib/contactSubmit.ts); anything
 * else is { sent: false } and the page falls back to the JotForm itself, filled in.
 * Either way Marqueta posts the note in Slack afterwards (src/lib/contactNotify.ts), saying
 * whether JotForm took it; the answer to the visitor never waits on, or depends on, Slack.
 *
 * Public, so it is narrow: same-origin browsers only, a small body, bounded fields, and a
 * hidden field (`company`) that people leave empty and robots fill, and a limit per address
 * (src/lib/contactRateLimit.server.ts). It can only ever post
 * to the one form in siteConfig; nothing in the request chooses where it goes.
 */
import { NextResponse, after } from 'next/server'
import { siteConfig } from '@/lib/config'
import { clientIp, contactOverLimit } from '@/lib/contactRateLimit.server'
import { sendContactToSlack } from '@/lib/contactNotify.server'
import { contactErrors, jotformAccepted, jotformBody, jotformSubmitUrl, readContactFields } from '@/lib/contactSubmit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const answer = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(request.url).host) return answer({ sent: false, error: 'Send this from the contact page.' }, 403)
  const raw = await request.text()
  if (raw.length > 8 * 1024) return answer({ sent: false, error: 'That note is too long.' }, 413)
  let input: unknown
  try { input = JSON.parse(raw) } catch { return answer({ sent: false, error: 'Send a JSON body.' }, 400) }
  // The trap: a real visitor never sees this field. Say "sent" and send nothing.
  if (input && typeof input === 'object' && typeof (input as { company?: unknown }).company === 'string' && (input as { company: string }).company.trim()) return answer({ sent: true })

  const fields = readContactFields(input)
  const errors = contactErrors(fields)
  if (Object.keys(errors).length) return answer({ sent: false, errors }, 422)
  // More notes than a person sends: not sent from here; the page shows the form itself.
  if (await contactOverLimit(clientIp(request))) return answer({ sent: false }, 429)

  try {
    const response = await fetch(jotformSubmitUrl(siteConfig.jotformId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: `https://form.jotform.com/${siteConfig.jotformId}` },
      body: jotformBody(siteConfig.jotformId, fields),
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    })
    const body = response.status === 200 ? await response.text() : ''
    const accepted = jotformAccepted(response.status, body, response.headers.get('location') || '')
    after(() => sendContactToSlack(fields, accepted))
    if (accepted) return answer({ sent: true })
    console.warn(`[contact] JotForm did not accept a submission (status ${response.status}); the page shows the form itself.`)
    return answer({ sent: false }, 502)
  } catch (error) {
    after(() => sendContactToSlack(fields, false))
    console.warn('[contact] JotForm could not be reached; the page shows the form itself.', error instanceof Error ? error.name : '')
    return answer({ sent: false }, 502)
  }
}
