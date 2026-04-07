import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { nanoid } from 'nanoid'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function POST(request: NextRequest) {
  const { type } = await request.json()

  if (!['caseStudy', 'feature'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const slug = `untitled-${nanoid(6).toLowerCase()}`
  const title = 'Untitled'

  const doc = await client.create({
    _type: type,
    title,
    slug: { _type: 'slug', current: slug },
  })

  // Redirect to the Studio editor for this document
  const studioUrl = `/studio/structure/${type};${doc._id}`

  return NextResponse.json({ id: doc._id, slug, studioUrl })
}
