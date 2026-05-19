import { siteConfig } from '@/lib/config'
import { normalizeVisitorEmail, previewText, type SanityChatMessage } from '@/lib/chat/validation'

export const NO_RESPONSE_EMAIL_RETRY_MS = 60 * 60 * 1000

interface NoResponseEmailThread {
  _id: string
  status?: string
  visitor?: { name?: string; email?: string }
  messages?: SanityChatMessage[]
  source?: { pageUrl?: string }
  noResponseEmailSentAt?: string
  noResponseEmailAttemptedAt?: string
}

export interface NoResponseEmailDraft {
  to: string
  subject: string
  text: string
  html: string
}

interface ResendSendResponse {
  id?: string
  name?: string
  message?: string
  error?: string
}

const closedStatuses = new Set(['resolved', 'spam', 'archived'])

export function getNoResponseEmailConfig() {
  return {
    enabled: process.env.CHAT_NO_RESPONSE_EMAIL_ENABLED !== 'false',
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.CHAT_NO_RESPONSE_EMAIL_FROM || `GoInvo <${siteConfig.email.hello}>`,
    replyTo: process.env.CHAT_NO_RESPONSE_EMAIL_REPLY_TO || siteConfig.email.hello,
  }
}

export function isNoResponseEmailConfigured() {
  const config = getNoResponseEmailConfig()
  return Boolean(config.enabled && config.apiKey && config.from)
}

export function getNoResponseEmailDraft(thread: NoResponseEmailThread, now = new Date()) {
  if (thread.noResponseEmailSentAt) return null
  if (thread.status && closedStatuses.has(thread.status)) return null

  const visitorEmail = normalizeVisitorEmail(thread.visitor?.email)
  if (!visitorEmail) return null

  const lastAttemptTime = thread.noResponseEmailAttemptedAt
    ? Date.parse(thread.noResponseEmailAttemptedAt)
    : null
  if (lastAttemptTime && Number.isFinite(lastAttemptTime) && now.getTime() - lastAttemptTime < NO_RESPONSE_EMAIL_RETRY_MS) {
    return null
  }

  const messages = thread.messages || []
  if (messages.some((message) => message.authorType === 'team' && message.fallbackKind !== 'noResponse')) {
    return null
  }

  const firstVisitorMessage = messages.find((message) => message.authorType === 'visitor')
  if (!firstVisitorMessage) return null

  const firstMessageTime = Date.parse(firstVisitorMessage.createdAt)
  if (!Number.isFinite(firstMessageTime)) return null
  if (now.getTime() - firstMessageTime < siteConfig.chat.noResponse.delayMs) return null

  const name = thread.visitor?.name?.trim()
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const sourceLines = thread.source?.pageUrl ? ['', `Source page: ${thread.source.pageUrl}`] : []
  const question = firstVisitorMessage.text

  const text = [
    greeting,
    '',
    "Sorry we couldn't answer your website chat in real time. We received your message and will reply as soon as we can.",
    '',
    'You can reply directly to this email, or keep the chat open if you are still on the site.',
    '',
    'Your message:',
    question,
    ...sourceLines,
    '',
    '- GoInvo',
  ]
    .join('\n')

  return {
    to: visitorEmail,
    subject: 'We received your GoInvo chat',
    text,
    html: renderNoResponseEmailHtml({
      greeting,
      question,
      sourceUrl: thread.source?.pageUrl,
    }),
  }
}

export async function sendNoResponseEmail(draft: NoResponseEmailDraft) {
  const config = getNoResponseEmailConfig()
  if (!config.enabled) return { ok: false as const, skipped: true as const, error: 'disabled' }
  if (!config.apiKey) return { ok: false as const, skipped: true as const, error: 'missing RESEND_API_KEY' }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [draft.to],
      subject: draft.subject,
      text: draft.text,
      html: draft.html,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    }),
  })

  const data = (await response.json().catch(() => ({}))) as ResendSendResponse
  if (!response.ok || !data.id) {
    return {
      ok: false as const,
      error: data.message || data.error || response.statusText || 'Email send failed',
    }
  }

  return { ok: true as const, id: data.id }
}

function renderNoResponseEmailHtml(input: {
  greeting: string
  question: string
  sourceUrl?: string
}) {
  const sourceHtml = input.sourceUrl
    ? `<p style="margin: 24px 0 0; color: #5f6668; font-size: 13px;">Source page: <a href="${escapeHtml(input.sourceUrl)}" style="color: #007385;">${escapeHtml(input.sourceUrl)}</a></p>`
    : ''

  return `<!doctype html>
<html>
  <body style="margin: 0; padding: 0; background: #f6f7f7; font-family: Arial, sans-serif; color: #1d1b1a;">
    <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <div style="background: #ffffff; border: 1px solid #d9dedf; padding: 28px;">
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.55;">${escapeHtml(input.greeting)}</p>
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.55;">Sorry we couldn't answer your website chat in real time. We received your message and will reply as soon as we can.</p>
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.55;">You can reply directly to this email, or keep the chat open if you are still on the site.</p>
        <div style="border-left: 4px solid #e36216; padding-left: 16px; color: #24434d; font-size: 15px; line-height: 1.55;">
          ${escapeHtml(previewText(input.question, 600)).replace(/\n/g, '<br>')}
        </div>
        ${sourceHtml}
        <p style="margin: 28px 0 0; font-size: 16px; line-height: 1.55;">GoInvo</p>
      </div>
    </div>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
