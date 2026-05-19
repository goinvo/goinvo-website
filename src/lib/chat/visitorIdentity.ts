export interface ChatVisitorLocation {
  label: string
  slug: string
  city?: string
  region?: string
  country?: string
  timezone?: string
}

export function getVisitorLocationFromHeaders(headers: Headers): ChatVisitorLocation | undefined {
  const city = readLocationHeader(headers, 'x-vercel-ip-city')
  const region = readLocationHeader(headers, 'x-vercel-ip-country-region')
  const country = readLocationHeader(headers, 'x-vercel-ip-country')
  const timezone = readLocationHeader(headers, 'x-vercel-ip-timezone')
  const label = [city, region, country].filter(Boolean).join(', ')

  if (!label) return undefined

  return {
    label,
    slug: slugifyChatIdentifier(label),
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
    ...(country ? { country } : {}),
    ...(timezone ? { timezone } : {}),
  }
}

export function buildChatVisitorUid(input: {
  threadId: string
  location?: Pick<ChatVisitorLocation, 'slug'>
}) {
  const threadSlug = getChatThreadShortId(input.threadId)
  const locationSlug =
    (input.location?.slug || 'website-visitor')
      .slice(0, 64 - threadSlug.length - 1)
      .replace(/-+$/g, '') || 'visitor'

  return `${locationSlug}-${threadSlug}`
}

export function getChatThreadShortId(threadId: string) {
  return (
    threadId
      .replace(/^chatThread\./, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
      .slice(0, 8) || 'chat'
  )
}

export function buildGeneratedChatTitle(visitorUid: string) {
  return `Website chat ${visitorUid}`
}

export function slugifyChatIdentifier(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'visitor'
  )
}

function readLocationHeader(headers: Headers, name: string) {
  const value = headers.get(name)
  if (!value) return undefined

  try {
    return decodeURIComponent(value).trim() || undefined
  } catch {
    return value.trim() || undefined
  }
}
