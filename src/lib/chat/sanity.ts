import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

let chatClient: SanityClient | null = null

export function isChatSanityConfigured() {
  return Boolean(projectId && dataset && writeToken)
}

export function getChatSanityClient() {
  if (!isChatSanityConfigured()) return null

  if (!chatClient) {
    chatClient = createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }

  return chatClient
}
