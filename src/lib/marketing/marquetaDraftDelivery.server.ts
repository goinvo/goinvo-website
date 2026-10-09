/**
 * Draft something and post it in a Slack thread — the one path every drafted
 * draft takes, whether somebody typed `draft post: …` or pressed Draft it on a
 * suggestion. One path means one card, one calendar record shape, and one
 * discard button that bins it.
 *
 * Idempotent on `keyTs`: the draft lands at `draftDocIdForMessage({channel,
 * ts: keyTs})`, and a second run that finds it there says so (or stays quiet,
 * for a Slack redelivery) instead of drafting twice.
 */

import { getSlackPermalink, postSlackMessage } from '@/lib/chat/slack'
import { getMarketingWriteClientFor } from './client'
import { draftDocIdForMessage } from './ideaCapture'
import { formatCitationsForSlack } from './marquetaCitations'
import { chunkForSlack, FORMAT_LABEL, generatedToCalendarDraft, type GenerationFormat } from './marquetaGenerate'
import { runMarquetaGeneration } from './marquetaGenerate.server'
import { isRendomatCreateConfigured } from './rendomat'
import { MARQUETA_IDENTITY } from './marquetaStyle'
import { buildGenerationResultBlocks } from './slackDelegation'
import { studioViewUrl } from './taskLinks'

/** "a script" / "an outline" — a small article, so the confirmation reads right. */
export function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`
}

export function postInThread(input: { channel: string; threadTs?: string }) {
  return (text: string, blocks?: Record<string, unknown>[]) =>
    postSlackMessage({
      channel: input.channel,
      threadTs: input.threadTs,
      ...MARQUETA_IDENTITY,
      unfurl: false,
      text,
      ...(blocks ? { blocks } : {}),
    })
}

/** Has a draft already been filed under this key? A failed check is treated as no. */
export async function draftAlreadyFiled(channel: string, keyTs: string): Promise<boolean> {
  try {
    const existing = await getMarketingWriteClientFor('marketingCalendarItem').fetch<{ _id: string } | null>(
      `*[_id == $id][0]{ _id }`,
      { id: draftDocIdForMessage({ channel, ts: keyTs }) },
    )
    return Boolean(existing)
  } catch {
    return false
  }
}

/**
 * The slow part: draft, file on the calendar with no date, post the card.
 * Never throws — every failure is said in the thread.
 *
 * `permalinkTs` is the message the draft should link back to: the request
 * itself, or the suggestions card a Draft it was pressed on.
 */
export async function draftAndPost(input: {
  format: GenerationFormat
  topic: string
  channel: string
  threadTs?: string
  keyTs: string
  permalinkTs: string
  personName: string
}): Promise<void> {
  const post = postInThread(input)
  const label = FORMAT_LABEL[input.format]
  try {
    const result = await runMarquetaGeneration({ format: input.format, topic: input.topic })
    if (!result.ok) {
      await post(result.message)
      return
    }

    const permalink = await getSlackPermalink(input.channel, input.permalinkTs)
    await getMarketingWriteClientFor('marketingCalendarItem').createIfNotExists(
      generatedToCalendarDraft({
        generated: result.generated,
        channel: input.channel,
        ts: input.keyTs,
        // Where the card goes: the thread when there is one, else the channel itself (a DM).
        threadTs: input.threadTs,
        personName: input.personName,
        topic: input.topic,
        permalink,
        sources: result.citations,
      }),
    )

    const base = process.env.MARKETING_PUBLIC_BASE_URL
    await post(
      `Drafted ${withArticle(label)}: ${result.generated.title}`,
      buildGenerationResultBlocks({
        formatLabel: label,
        title: result.generated.title,
        bodyChunks: chunkForSlack(result.generated.body),
        citationChunks: chunkForSlack(formatCitationsForSlack(result.citations)),
        sourceCount: result.citations.length,
        brandVoiceName: result.brandVoiceName,
        channel: input.channel,
        ts: input.keyTs,
        studioUrl: base ? studioViewUrl(base, 'calendar') : undefined,
        // Only a script can become a video, and only when Rendomat can be asked to make one.
        rendomat: { configured: isRendomatCreateConfigured() },
        format: input.format,
      }),
    )
  } catch (error) {
    console.error('[marqueta] generation failed', error instanceof Error ? error.name : 'UnknownError')
    await post('That draft did not come together. Try again in a moment, or the Studio assistant can.')
  }
}
