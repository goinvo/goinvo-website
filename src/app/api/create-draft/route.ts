import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { nanoid } from 'nanoid'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

const client = writeToken
  ? createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  : null

export async function POST(request: NextRequest) {
  if (!client) {
    return NextResponse.json(
      { error: 'Sanity write token is not configured' },
      { status: 500 },
    )
  }

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

  return NextResponse.json({ id: doc._id, slug, type })
}
