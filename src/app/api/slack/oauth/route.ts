import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SlackOAuthResponse {
  ok: boolean
  access_token?: string
  bot_user_id?: string
  app_id?: string
  team?: {
    id?: string
    name?: string
  }
  error?: string
}

export async function GET(request: NextRequest) {
  if (process.env.SLACK_OAUTH_SETUP_ENABLED !== 'true') {
    return new NextResponse('Slack OAuth setup is disabled.', { status: 404 })
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = process.env.SLACK_OAUTH_SETUP_STATE

  if (!expectedState || state !== expectedState) {
    return new NextResponse('Invalid Slack OAuth state.', { status: 403 })
  }

  if (!code) {
    return new NextResponse('Missing Slack OAuth code.', { status: 400 })
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  const redirectUri = `${request.nextUrl.origin}/api/slack/oauth`

  if (!clientId || !clientSecret) {
    return new NextResponse('Slack OAuth client credentials are not configured.', { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const data = (await response.json()) as SlackOAuthResponse

  if (!response.ok || !data.ok || !data.access_token) {
    return html(
      'Slack OAuth failed',
      `<p>Slack returned <code>${escapeHtml(data.error || response.statusText)}</code>.</p>`,
      400,
    )
  }

  const envLines = [
    `SLACK_BOT_TOKEN=${data.access_token}`,
    `SLACK_CHAT_CHANNEL_ID=${process.env.SLACK_CHAT_CHANNEL_ID || 'C0B5EC9LGFJ'}`,
    `SLACK_SIGNING_SECRET=${process.env.SLACK_SIGNING_SECRET || '<set-this-from-slack-app-basic-information>'}`,
    'SLACK_OAUTH_SETUP_ENABLED=false',
  ]

  return html(
    'Slack OAuth complete',
    `
      <p>The GoInvo Website Chat app is installed${data.team?.name ? ` in ${escapeHtml(data.team.name)}` : ''}.</p>
      <p>Copy these values into Vercel and your local <code>.env.local</code>. Then disable OAuth setup.</p>
      <pre>${escapeHtml(envLines.join('\n'))}</pre>
      <p>Invite <code>@GoInvo Website Chat</code> to <code>#website-chatbot</code> if you have not already.</p>
    `,
  )
}

function html(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 48px; max-width: 840px; line-height: 1.6; }
            pre { background: #f6f6f6; border: 1px solid #d0cfce; padding: 16px; overflow: auto; }
            code { background: #f6f6f6; padding: 2px 4px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          ${body}
        </body>
      </html>`,
    {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    },
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
