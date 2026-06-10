/**
 * Server-only Sanity write client for the marketing CMS.
 *
 * All configuration comes from src/sanity/env.ts (which reads env vars), so this
 * stays site-agnostic: another site can point env.ts at a different project and
 * reuse this verbatim. The write token must never reach the browser, so only API
 * routes / server code should call this.
 */
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

/**
 * Returns a configured Sanity write client (useCdn: false so writes and reads
 * are always fresh). Throws a clear Error when the project id or write token is
 * missing, rather than silently creating a client that cannot write.
 */
export function getMarketingWriteClient(): SanityClient {
  if (!projectId) {
    throw new Error(
      'Marketing write client is not configured: NEXT_PUBLIC_SANITY_PROJECT_ID is empty.',
    )
  }
  if (!writeToken) {
    throw new Error(
      'Marketing write client is not configured: set SANITY_WRITE_TOKEN (or SANITY_API_WRITE_TOKEN).',
    )
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    token: writeToken,
    useCdn: false,
  })
}
