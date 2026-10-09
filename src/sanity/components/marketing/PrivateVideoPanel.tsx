import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Flex, Stack, Text, TextArea } from '@sanity/ui'
import { useClient, useCurrentUser } from 'sanity'
import { clientForType } from '@/lib/marketing/datasetRouting'
import { LABEL } from '@/lib/marketing/marquetaStyle'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { PUBLIC_COPY_CONFIRMATION, type ClientSignOff, type PrivateVideo, type SignOffStatus } from '@/lib/marketing/rendomatLink'
import { authenticatedMarketingRequest } from './authenticatedMarketingRequest'
import { useConfirmDialog } from './ConfirmDialog'

const API_VERSION = '2024-01-01'

type PanelState = {
  rendomatProjectUrl?: string
  rendomatLinkedAt?: string
  privateVideo?: PrivateVideo | null
  clientSignOff?: ClientSignOff | null
  hasSocialVideo?: boolean
}

const STATE_QUERY = `*[_type == "marketingCalendarItem" && _id == $id][0]{
  rendomatProjectUrl, rendomatLinkedAt, privateVideo, clientSignOff,
  "hasSocialVideo": defined(socialVideo.asset)
}`

const SIGN_OFF_WORDS: Record<SignOffStatus, { label: string; tone: 'caution' | 'positive' | 'critical' }> = {
  pending: { label: 'Waiting for the client', tone: 'caution' },
  approved: { label: 'Client approved', tone: 'positive' },
  changesRequested: { label: 'Client asked for changes', tone: 'critical' },
}

function when(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * A calendar item's Rendomat video: the project link, the PRIVATE render (watched
 * through a 15-minute signed URL, never a stored link), the client's sign-off,
 * and — only once the client approved — the copy to public media for posting.
 *
 * Renders nothing for an item that was never made in Rendomat. Nothing here
 * schedules or posts: the copy fills the item's video and stops.
 */
export function PrivateVideoPanel({ itemId }: { itemId: string }) {
  const studioClient = useClient({ apiVersion: API_VERSION })
  const readClient = useMemo(() => clientForType(studioClient, 'marketingCalendarItem'), [studioClient])
  const proofClient = useMemo(() => studioClient.withConfig({ dataset: OUTREACH_DATASET }), [studioClient])
  const user = useCurrentUser()
  const { confirm, confirmDialog } = useConfirmDialog()

  const [state, setState] = useState<PanelState | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      setState(await readClient.fetch<PanelState | null>(STATE_QUERY, { id: itemId }))
    } catch {
      setError('Couldn’t read this item’s video.')
    }
  }, [readClient, itemId])

  useEffect(() => {
    setState(null)
    setVideoUrl('')
    setNote('')
    setError('')
    setNotice('')
    void load()
  }, [load])

  const run = async (key: string, work: () => Promise<void>) => {
    if (busy) return
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await work()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work. Nothing changed.')
    } finally {
      setBusy('')
    }
  }

  if (!state || (!state.rendomatProjectUrl && !state.privateVideo?.pathname)) return null

  const by = user?.name || user?.email || ''
  const signOff = state.clientSignOff?.status || (state.privateVideo?.pathname ? 'pending' : null)
  const copied = Boolean(state.privateVideo?.publicCopyAt || state.hasSocialVideo)

  const watch = () =>
    run('watch', async () => {
      const signed = await authenticatedMarketingRequest<{ url: string; expiresAt: string }>(
        '/api/marketing/private-media/sign',
        { itemId },
        'POST',
        proofClient,
      )
      setVideoUrl(signed.url)
    })

  const recordSignOff = (status: SignOffStatus) =>
    run(`signoff-${status}`, async () => {
      await authenticatedMarketingRequest('/api/marketing/private-media/sign-off', { itemId, status, by, note }, 'POST', proofClient)
      setNote('')
      setNotice(status === 'pending' ? 'Back to waiting for the client.' : `Recorded: ${SIGN_OFF_WORDS[status].label.toLowerCase()}.`)
      await load()
    })

  const copyToPublic = async () => {
    const ok = await confirm({
      title: 'Copy to public media?',
      message: PUBLIC_COPY_CONFIRMATION,
      confirmLabel: 'Copy to public media',
      tone: 'caution',
    })
    if (!ok) return
    await run('copy', async () => {
      await authenticatedMarketingRequest('/api/marketing/private-media/publish', { itemId, confirmed: true, by }, 'POST', proofClient)
      setNotice('Copied. The item’s video is filled in; nothing was scheduled.')
      await load()
    })
  }

  return (
    <Card padding={3} radius={2} border tone="transparent">
      {confirmDialog}
      <Stack space={3}>
        <Flex gap={2} align="center" wrap="wrap">
          <Text size={1} weight="semibold">Video from Rendomat</Text>
          {signOff && (
            <Badge tone={SIGN_OFF_WORDS[signOff].tone} fontSize={1}>
              {SIGN_OFF_WORDS[signOff].label}
            </Badge>
          )}
          {state.rendomatProjectUrl && (
            <a href={state.rendomatProjectUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
              {LABEL.OPEN_IN_RENDOMAT}
            </a>
          )}
        </Flex>

        {!state.privateVideo?.pathname ? (
          <Text size={1} muted>
            Exported to Rendomat{state.rendomatLinkedAt ? ` on ${when(state.rendomatLinkedAt)}` : ''}. Once it is rendered, the file
            comes back here privately — usually by the next morning.
          </Text>
        ) : (
          <>
            <Text size={1} muted>
              Private until the client signs off: only signed-in teammates can watch it, through a link that expires in 15 minutes.
            </Text>
            {videoUrl ? (
              <video src={videoUrl} controls preload="metadata" style={{ width: '100%', maxHeight: 480, background: '#000', borderRadius: 4 }} />
            ) : (
              <Flex>
                <Button mode="ghost" text={busy === 'watch' ? 'Opening…' : 'Watch the private video'} onClick={watch} disabled={Boolean(busy)} fontSize={1} />
              </Flex>
            )}

            {!copied && (
              <Stack space={2}>
                <TextArea
                  aria-label="Note on the client’s answer"
                  placeholder="Optional note: who at the client answered, and what they said"
                  value={note}
                  onChange={(event) => setNote(event.currentTarget.value)}
                  rows={2}
                  fontSize={1}
                />
                <Flex gap={2} wrap="wrap">
                  {signOff !== 'approved' && (
                    <Button tone="positive" text="Client approved" onClick={() => recordSignOff('approved')} disabled={Boolean(busy) || !by} fontSize={1} />
                  )}
                  {signOff !== 'changesRequested' && (
                    <Button mode="ghost" text="Client asked for changes" onClick={() => recordSignOff('changesRequested')} disabled={Boolean(busy) || !by} fontSize={1} />
                  )}
                  {signOff !== 'pending' && (
                    <Button mode="bleed" text="Back to waiting" onClick={() => recordSignOff('pending')} disabled={Boolean(busy)} fontSize={1} />
                  )}
                </Flex>
                {state.clientSignOff?.by && state.clientSignOff.status !== 'pending' && (
                  <Text size={0} muted>
                    Recorded by {state.clientSignOff.by}
                    {state.clientSignOff.at ? ` on ${when(state.clientSignOff.at)}` : ''}
                    {state.clientSignOff.note ? ` — “${state.clientSignOff.note}”` : ''}
                  </Text>
                )}
              </Stack>
            )}

            {signOff === 'approved' && !copied && (
              <Flex>
                <Button tone="caution" text={busy === 'copy' ? 'Copying…' : 'Copy to public media for posting…'} onClick={copyToPublic} disabled={Boolean(busy) || !by} fontSize={1} />
              </Flex>
            )}
            {copied && (
              <Text size={1} muted>
                Copied to public media{state.privateVideo?.publicCopyBy ? ` by ${state.privateVideo.publicCopyBy}` : ''}
                {state.privateVideo?.publicCopyAt ? ` on ${when(state.privateVideo.publicCopyAt)}` : ''}. Posting it is still a separate choice on this item.
              </Text>
            )}
          </>
        )}

        {error && (
          <Card tone="critical" padding={2} radius={2}>
            <Text size={1}>{error}</Text>
          </Card>
        )}
        {notice && (
          <Text size={1} muted>
            {notice}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
