import { NextRequest, NextResponse, after } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { getSlackUserDisplayName, openSlackModal, verifySlackRequest } from '@/lib/chat/slack'
import {
  MARKETING_ACTION,
  buildActionAcknowledgement,
  buildTaskDetailBlocks,
  decodeActionValue,
  isMarketingAction,
  modalTitle,
} from '@/lib/marketing/slackDelegation'
import {
  claimMarketingTask,
  declineMarketingTask,
  getMarketingTaskDetail,
  linkMarketingIdentity,
  setMarketingAvailability,
} from '@/lib/marketing/slackActions.server'
import { submitDisputeEvidence } from '@/lib/shop/disputeEvidence'
import { stripeDisputeDocumentId } from '@/lib/shop/ids'

export const dynamic = 'force-dynamic'

interface SlackInteractionPayload {
  type?: string
  user?: { id?: string; name?: string; username?: string }
  actions?: Array<{
    action_id?: string
    value?: string
    // static_select sends the chosen option here rather than in `value`.
    selected_option?: { value?: string }
  }>
  // Slack includes this on block_actions; POST a message here to reply.
  response_url?: string
  /** Valid for ~3 seconds; required to open a modal. */
  trigger_id?: string
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

  // Task detail. Handled ON the request path, not deferred: trigger_id expires
  // in about three seconds, so anything queued behind after() is too late and
  // Slack answers expired_trigger_id.
  if (payload.type === 'block_actions' && action?.action_id === MARKETING_ACTION.details) {
    const decoded = decodeActionValue(action.value)
    if (decoded) {
      const task = await getMarketingTaskDetail(decoded.taskId)
      if (task) {
        const blocks = buildTaskDetailBlocks({
          ...task,
          minutes: task.estimatedMinutes,
        })
        const opened = await openSlackModal(payload.trigger_id || '', {
          type: 'modal',
          title: { type: 'plain_text', text: modalTitle(task.title) },
          close: { type: 'plain_text', text: 'Close' },
          blocks,
        })
        // A modal can still fail (expired trigger, transient error). Falling back
        // to an ephemeral reply means the person gets the detail either way.
        if (!opened) {
          const lines = blocks
            .map((block) => (block.text?.text as string) || '')
            .filter(Boolean)
            .join(String.fromCharCode(10, 10))
          after(async () => {
            await postSlackResponse(payload.response_url, lines || task.title)
          })
        }
        return NextResponse.json({ ok: true })
      }
    }
    after(async () => {
      await postSlackResponse(payload.response_url, 'That task no longer exists.')
    })
    return NextResponse.json({ ok: true })
  }

  // Marketing delegation: claim a task, hand it back, or say you are away.
  if (payload.type === 'block_actions' && isMarketingAction(action?.action_id)) {
    const responseUrl = payload.response_url
    const userId = payload.user?.id || ''
    const decoded = decodeActionValue(action?.value)
    const actionId = action!.action_id!

    // Answer Slack immediately and do the write afterwards: an interaction that
    // takes longer than 3 seconds shows the user a failure even when it worked.
    after(async () => {
      try {
        const personName =
          (await getSlackUserDisplayName(userId)) || payload.user?.name || payload.user?.username || 'Someone'

        if (actionId === MARKETING_ACTION.linkIdentity) {
          const ownerName = action?.selected_option?.value || ''
          if (!ownerName) {
            await postSlackResponse(responseUrl, 'No name was selected.')
            return
          }
          const linked = await linkMarketingIdentity({ ownerName, slackUserId: userId })
          await postSlackResponse(
            responseUrl,
            `${buildActionAcknowledgement({ action: actionId, userId })} ${linked.message || ''}`.trim(),
          )
          return
        }

        if (actionId === MARKETING_ACTION.away) {
          const result = await setMarketingAvailability({
            personName,
            slackUserId: userId,
            status: 'away',
          })
          await postSlackResponse(
            responseUrl,
            `${buildActionAcknowledgement({ action: actionId, userId })} ${result.message || ''}`.trim(),
          )
          return
        }

        if (!decoded) {
          await postSlackResponse(responseUrl, 'That button is missing its task — try the plan in the Studio.')
          return
        }

        const result =
          actionId === MARKETING_ACTION.claim
            ? await claimMarketingTask({ taskId: decoded.taskId, personName, slackUserId: userId })
            : await declineMarketingTask({ taskId: decoded.taskId, personName })

        await postSlackResponse(
          responseUrl,
          result.ok
            ? buildActionAcknowledgement({ action: actionId, userId, taskTitle: result.taskTitle })
            : result.message || 'That did not work.',
        )
      } catch (err) {
        console.error('[slack] marketing action failed', err)
        await postSlackResponse(responseUrl, 'Something went wrong recording that. The plan in the Studio is still correct.')
      }
    })

    return NextResponse.json({ ok: true })
  }

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

  if (
    payload.type === 'block_actions' &&
    action?.action_id === 'goinvo_dispute_submit_evidence' &&
    action.value
  ) {
    const disputeId = action.value
    const responseUrl = payload.response_url
    const userName = payload.user?.name || payload.user?.username

    // Same 3s-ack shape as above: Stripe calls and Sanity writes happen after
    // the ack so the button never hangs and Slack never retries the click.
    after(async () => {
      const result = await submitDisputeEvidence({
        disputeDocId: stripeDisputeDocumentId(disputeId),
        submittedBy: userName,
      })

      const messages: Record<string, string> = {
        'not-configured': 'The shop CMS is not configured, so nothing was sent.',
        'not-found': 'That dispute is not in the CMS — nothing was sent.',
        submitted: `Evidence submitted to Stripe${userName ? ` by ${userName}` : ''}.`,
      }
      await postSlackResponse(
        responseUrl,
        messages[result.status] ||
          ('message' in result ? result.message : 'Could not submit the evidence.'),
      )
    })

    return new NextResponse(null, { status: 200 })
  }

  return NextResponse.json({ ok: true })
}
