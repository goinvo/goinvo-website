import { NextRequest, NextResponse } from 'next/server'
import { siteConfig } from '@/lib/config'
import { isAllowedChatRequest, isChatGloballyEnabled } from '@/lib/chat/config'
import { isChatSanityConfigured } from '@/lib/chat/sanity'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const enabled =
    isChatGloballyEnabled() &&
    isChatSanityConfigured() &&
    isAllowedChatRequest(request)

  return NextResponse.json({
    enabled,
    pollingIntervalMs: siteConfig.chat.pollingIntervalMs,
  })
}
