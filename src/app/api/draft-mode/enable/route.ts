import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { previewToken } from '@/sanity/env'

const handler = previewToken
  ? defineEnableDraftMode({ client: client.withConfig({ token: previewToken }) }).GET
  : async () =>
      NextResponse.json(
        {
          error: 'No Sanity token configured',
          hint: 'Set SANITY_API_READ_TOKEN (Viewer scope) in .env.local and the Vercel project env vars. SANITY_WRITE_TOKEN is only needed for creating/deleting drafts.',
        },
        { status: 503 },
      )

export { handler as GET }
