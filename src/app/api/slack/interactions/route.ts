import { NextRequest, NextResponse } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { verifySlackRequest } from '@/lib/chat/slack'

export const dynamic = 'force-dynamic'

interface SlackInteractionPayload {
  type?: string
  user?: { id?: string; name?: string; username?: string }
  actions?: Array<{ action_id?: string; value?: string }>
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifySlackRequest(request.headers, rawBody)) {
    return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 401 })
  }

  const params = new URLSearchParams(rawBody)
  const payloadValue = params.get('payload')
  if (!payloadValue) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  const payload = JSON.parse(payloadValue) as SlackInteractionPayload
  const action = payload.actions?.[0]

  if (payload.type === 'block_actions' && action?.action_id === 'goinvo_chat_mark_resolved' && action.value) {
    const client = getChatSanityClient()
    if (!client) {
      return NextResponse.json({ text: 'Chat is not configured.' }, { status: 200 })
    }

    await client
      .patch(action.value)
      .set({
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      })
      .commit()

    return NextResponse.json({
      response_type: 'ephemeral',
      text: `Marked chat thread as resolved${payload.user?.name ? ` for ${payload.user.name}` : ''}.`,
      replace_original: false,
    })
  }

  return NextResponse.json({ ok: true })
}
