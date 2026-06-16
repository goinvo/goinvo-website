import { NextRequest, NextResponse, after } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { verifySlackRequest } from '@/lib/chat/slack'

export const dynamic = 'force-dynamic'

interface SlackInteractionPayload {
  type?: string
  user?: { id?: string; name?: string; username?: string }
  actions?: Array<{ action_id?: string; value?: string }>
  // Slack includes this on block_actions; POST a message here to reply.
  response_url?: string
}

// For block_actions, the HTTP body is ignored — confirmations must be POSTed to
// the interaction's response_url.
async function postSlackResponse(
  responseUrl: string | undefined,
  text: string,
) {
  if (!responseUrl) return
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        replace_original: false,
        text,
      }),
    })
  } catch (err) {
    console.error('[slack] response_url post failed', err)
  }
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

  if (
    payload.type === 'block_actions' &&
    action?.action_id === 'goinvo_chat_mark_resolved' &&
    action.value
  ) {
    const threadId = action.value
    const responseUrl = payload.response_url
    const userName = payload.user?.name

    // Slack requires an ack within ~3s or the button hangs ("didn't respond")
    // and Slack retries the interaction. Do the Sanity write (and the
    // confirmation) AFTER acking so a slow commit or an error can't hang it.
    after(async () => {
      const client = getChatSanityClient()
      if (!client) {
        await postSlackResponse(responseUrl, 'Chat is not configured.')
        return
      }
      try {
        await client
          .patch(threadId)
          .set({ status: 'resolved', resolvedAt: new Date().toISOString() })
          .commit()
        await postSlackResponse(
          responseUrl,
          `Marked chat thread as resolved${userName ? ` for ${userName}` : ''}.`,
        )
      } catch (err) {
        console.error('[slack] mark-resolved failed', err)
        await postSlackResponse(
          responseUrl,
          'Could not mark the thread resolved — please try again.',
        )
      }
    })

    // Immediate ack — stops the button spinner.
    return new NextResponse(null, { status: 200 })
  }

  return NextResponse.json({ ok: true })
}
