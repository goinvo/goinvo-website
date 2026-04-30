import { draftMode } from 'next/headers'
import { client } from '@/sanity/lib/client'
import { browserToken } from '@/sanity/lib/live'
import { ThrottledSanityLiveClient } from './ThrottledSanityLiveClient'

/**
 * Server Component that replaces the default <SanityLive />.
 *
 * It reads server-only values (draft mode, client config, token) and passes
 * them to ThrottledSanityLiveClient, which wraps the real SanityLive client
 * component with a debounced revalidateSyncTags so the preview doesn't
 * re-render the entire page on every keystroke.
 */
export async function ThrottledSanityLive() {
  const {
    projectId,
    dataset,
    apiHost,
    apiVersion,
    useProjectHostname,
    requestTagPrefix,
  } = client.config()
  const { isEnabled } = await draftMode()

  return (
    <ThrottledSanityLiveClient
      projectId={projectId!}
      dataset={dataset!}
      apiHost={apiHost}
      apiVersion={apiVersion}
      useProjectHostname={useProjectHostname}
      requestTagPrefix={requestTagPrefix}
      token={typeof browserToken === 'string' && isEnabled ? browserToken : undefined}
      draftModeEnabled={isEnabled}
      draftModePerspective="drafts"
    />
  )
}
