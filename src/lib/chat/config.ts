import type { NextRequest } from 'next/server'
import { siteConfig } from '@/lib/config'

function normalizeHost(host: string) {
  const cleanHost = host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
  if (cleanHost.startsWith('::')) return cleanHost
  return cleanHost.split(':')[0]
}

export function getAllowedChatHosts() {
  const envHosts = (process.env.CHAT_WIDGET_ALLOWED_HOSTS || '')
    .split(',')
    .map(normalizeHost)
    .filter(Boolean)
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .filter((host): host is string => Boolean(host))
    .map(normalizeHost)

  return Array.from(
    new Set([...siteConfig.chat.allowedHosts.map(normalizeHost), ...envHosts, ...vercelHosts]),
  )
}

export function isChatGloballyEnabled() {
  return process.env.CHAT_WIDGET_ENABLED !== 'false'
}

export function isAllowedChatHost(host: string | null | undefined) {
  if (!host) return false
  return getAllowedChatHosts().includes(normalizeHost(host))
}

export function isAllowedChatRequest(request: NextRequest) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const source = origin || referer

  if (!source) return isAllowedChatHost(request.headers.get('host'))

  try {
    return isAllowedChatHost(new URL(source).hostname)
  } catch {
    return false
  }
}
