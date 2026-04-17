import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { readToken } from '@/sanity/env'

const handler = readToken
  ? defineEnableDraftMode({ client: client.withConfig({ token: readToken }) }).GET
  : async () =>
      NextResponse.json(
        {
          error: 'No Sanity token configured',
          hint: 'Set SANITY_API_READ_TOKEN (Viewer scope) or SANITY_WRITE_TOKEN in .env.local and the Vercel project env vars. Without a token, draft mode and the Presentation/visual-editing tools cannot connect.',
        },
        { status: 503 },
      )

export { handler as GET }
